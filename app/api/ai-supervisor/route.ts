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

  // Remove any inline styles, classes, or outer wrapper divs that clash with our clean Orange & White UI theme
  cleaned = cleaned
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/^<div[^>]*>/i, '')
    .replace(/<\/div>$/i, '')
    .trim();

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
  perModelTimeoutMs = 7000
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
      const cacheKey = `v2:${(keywordOrTitle || 'tutorial').trim().toLowerCase()}`;

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

      const prompt = `नीचे दिए गए article का एक super easy, conversational Hinglish summary तैयार करो।

Title: ${keywordOrTitle || 'AI Tutorial'}
Article Content:
${conciseContent}

Language & Tone Rules (VERY IMPORTANT):
- बिल्कुल दोस्त की तरह आम बोलचाल की आसान Hinglish में लिखो (जैसे article लिखा है: देवनागरी हिंदी + आसान English words जैसे prompt, tools, free, steps, beginners, try karo, milta hai, bana sakte ho).
- Robotic या किताबी शुद्ध हिंदी बिल्कुल मत लिखो। इन शब्दों से बचो: "प्रमुख", "संपूर्ण", "निष्कर्ष", "तय करें", "प्राप्त करें", "चयन करें", "आवश्यकता", "अत्यंत", "प्रदान", "चरण", "यदि", "तथा", "द्वारा"। इनकी जगह "देखो", "चुनो", "मिलेगा", "यूज करो", "अगर", "और", "से", "जरूरी", "बढ़िया" जैसे natural शब्द लिखो।
- Readers से friendly tone में बात करो (जैसे "आप आसानी से बना सकते हो", "बस ये steps follow करो")।

Formatting Rules (STRICT):
- सिर्फ clean semantic HTML tags दो: <h3>, <ul>, <ol>, <li>, <p>, <strong>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>.
- कोई भी inline style="..." या class="..." या wrapper <div> या <h2> title banner मत लगाओ, और \`\`\`html मत लिखो।
- ये 4 sections रखो:
  1. <h3>📌 मुख्य बातें (Key Points)</h3> — 3-4 छोटे bullet points में पूरा निचोड़।
  2. <h3>🛠️ काम के Tools और Features</h3> — अगर article में tools हैं तो छोटा और साफ <table> बनाओ (Columns: Tool, Khaas Baat, Price), वरना आसान bullet points दो।
  3. <h3>📝 आसान Step-by-Step तरीका</h3> — छोटे numbered steps (<ol>) में समझाओ कि कैसे करना है।
  4. <h3>💡 Pro Tips</h3> — <blockquote> में 2-3 काम की smart tricks बताओ जो सच में काम आएं।`;

      const systemInstruction =
        'आप Anwar (Aitoolhindi.online के founder) के style में लिखने वाले friendly Hinglish AI buddy हैं। आपकी भाषा बिल्कुल natural, conversational और beginners के लिए super easy होनी चाहिए — कोई robotic या formal हिंदी नहीं। Output सिर्फ clean HTML हो बिना किसी inline CSS या wrapper div के।';

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
          { error: 'कृपया कोई सवाल लिखें।' },
          { status: 400 }
        );
      }

      const qCacheKey = `v2:${(keywordOrTitle || '').trim().toLowerCase()}_${userQ.toLowerCase()}`;
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

      const prompt = `User का सवाल: "${userQ}"
Article Context: ${keywordOrTitle || 'AI Guide'}
Content:
${conciseContent}

निर्देश:
- बिल्कुल दोस्त जैसी आसान और conversational Hinglish में सीधा जवाब दो (देवनागरी हिंदी + simple English words जैसे prompt, free, tool, app, try karo)।
- किताबी या robotic हिंदी शब्द (जैसे आवश्यकता, प्राप्त करें, उपलब्ध, चयन करें) मत लिखो।
- सिर्फ clean HTML (<p>, <ul>, <li>, <strong>) दो, कोई inline style या \`\`\`html मत लगाओ।`;

      const systemInstruction =
        'आप Aitoolhindi.online के friendly AI buddy हैं जो हर सवाल का जवाब आसान बोलचाल की Hinglish में देते हैं।';

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
      'AI से जवाब मिलने में दिक्कत आई। कृपया थोड़ी देर में फिर से try करें।';
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
