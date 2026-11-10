import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory summary & Q&A cache for instant responses (0ms)
const summaryCache = new Map<string, { html: string; timestamp: number }>();
const questionCache = new Map<string, { html: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Ultra-fast model cascade with automatic fail-over
const FAST_FALLBACK_MODELS = [
  'gemini-flash-lite-latest', // ~1.2s - Fastest response time, high availability
  'gemini-3.5-flash-lite',   // ~1.4s - Ultra-low latency backup
  'gemini-3.5-flash',        // ~4.5s - High quality flash fallback
  'gemini-3.8-flash',        // Fallback with LOW thinking
] as const;

function cleanMarkdownHtml(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```$/i, '').trim();
  }
  return cleaned;
}

function extractConciseContent(html: string, maxChars = 4500): string {
  if (!html) return '';
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8220;|&#8221;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, maxChars);
}

// Executes generation with model cascade and per-model timeout
async function generateWithCascade(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  perModelTimeoutMs = 6000
): Promise<{ text: string; modelUsed: string; durationMs: number }> {
  let lastError: any = null;

  for (const model of FAST_FALLBACK_MODELS) {
    const startTime = Date.now();
    try {
      const config: any = {
        systemInstruction,
      };

      if (model === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout (${perModelTimeoutMs}ms) on ${model}`)),
          perModelTimeoutMs
        )
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const outputText = response.text || '';

      if (outputText.trim().length > 0) {
        const durationMs = Date.now() - startTime;
        return { text: outputText, modelUsed: model, durationMs };
      }
    } catch (err: any) {
      console.warn(`[AI Cascade] Model ${model} failed, trying next:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('सभी AI मॉडल प्रतिक्रिया देने में असमर्थ रहे। कृपया पुनः प्रयास करें।');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, keywordOrTitle, content, question, forceRefresh } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API Key उपलब्ध नहीं है। कृपया Settings > Secrets में GEMINI_API_KEY सेट करें।',
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // 1. Action: Summarize
    if (action === 'summarize') {
      const cacheKey = (keywordOrTitle || 'tutorial').trim().toLowerCase();

      // Check server cache first unless forceRefresh is requested
      if (!forceRefresh) {
        const cached = summaryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return NextResponse.json({
            summary: cached.html,
            cached: true,
            modelUsed: 'cache',
            durationMs: 0,
          });
        }
      }

      const conciseContent = extractConciseContent(content || '', 4000);

      const prompt = `हिंदी AI ट्यूटोरियल का त्वरित व सुंदर सारांश:
शीर्षक: ${keywordOrTitle || 'AI Tutorial'}
सामग्री:
${conciseContent}

निर्देश:
1. सीधे साफ़ HTML कोड आउटपुट दें (बिना \`\`\`html के)।
2. मुख्य भाग:
   - <h3>📌 मुख्य मुख्य बातें (Key Takeaways)</h3> (बुलेट पॉइंट्स)
   - <h3>🛠️ प्रमुख टूल्स और फीचर्स</h3> (टेबल: Tool Name, Features, Pricing)
   - <h3>📝 स्टेप-बाय-स्टेप सारांश</h3> (आसान स्टेप्स)
   - <h3>💡 एक्सपर्ट प्रो टिप्स</h3> (उपयोगी टिप्स)`;

      const systemInstruction =
        'आप Aitoolhindi.online के AI ट्यूटर हैं। तकनीकी AI विषयों का अत्यंत त्वरित, सरल और सुंदर HTML सारांश हिंदी में तैयार करें।';

      const result = await generateWithCascade(ai, prompt, systemInstruction, 7000);
      const summaryHtml = cleanMarkdownHtml(result.text);

      // Save to server cache
      summaryCache.set(cacheKey, { html: summaryHtml, timestamp: Date.now() });

      return NextResponse.json({
        summary: summaryHtml,
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        cached: false,
      });
    }

    // 2. Action: Question
    if (action === 'question') {
      const userQ = (question || '').trim();
      if (!userQ) {
        return NextResponse.json(
          { error: 'कृपया कोई प्रश्न दर्ज करें।' },
          { status: 400 }
        );
      }

      const qCacheKey = `${(keywordOrTitle || '').trim().toLowerCase()}_${userQ.toLowerCase()}`;
      if (!forceRefresh) {
        const cached = questionCache.get(qCacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return NextResponse.json({
            answer: cached.html,
            cached: true,
            modelUsed: 'cache',
            durationMs: 0,
          });
        }
      }

      const conciseContent = extractConciseContent(content || '', 3500);

      const prompt = `यूज़र का सवाल: "${userQ}"
आर्टिकल संदर्भ: ${keywordOrTitle || 'AI Guide'}
सामग्री:
${conciseContent}

निर्देश:
यूज़र के सवाल का त्वरित, सीधा व सटीक उत्तर हिंदी में दें। आउटपुट केवल साफ़ HTML (<p>, <ul>, <li>, <strong>) में हो।`;

      const systemInstruction =
        'आप Aitoolhindi.online के AI एक्सपर्ट हैं। उपयोगकर्ताओं के सवालों का त्वरित, सटीक और सरल हिंदी में समाधान दें।';

      const result = await generateWithCascade(ai, prompt, systemInstruction, 7000);
      const answerHtml = cleanMarkdownHtml(result.text);

      questionCache.set(qCacheKey, { html: answerHtml, timestamp: Date.now() });

      return NextResponse.json({
        answer: answerHtml,
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        cached: false,
      });
    }

    return NextResponse.json(
      { error: `अमान्य एक्शन: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[AI-Supervisor API Error]:', error);
    const message =
      error?.message ||
      'AI सेवा से संपर्क करने में समस्या आई। कृपया पुनः प्रयास करें।';
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
