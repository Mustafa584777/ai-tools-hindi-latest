import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

function cleanMarkdownHtml(raw: string): string {
  let cleaned = raw.trim();
  // Remove ```html and ``` backticks if model wrapped them
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```$/i, '').trim();
  }
  return cleaned;
}

function stripExcessiveHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, keywordOrTitle, content, question } = body;

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

    const strippedContent = stripExcessiveHtml(content || '').slice(0, 25000);

    if (action === 'summarize') {
      const prompt = `कृपया निम्नलिखित हिंदी AI ट्यूटोरियल आर्टिकल का विस्तृत, सुंदर और स्पष्ट सारांश (Summary) आसान हिंदी में तैयार करें:

शीर्षक (Title): ${keywordOrTitle || 'AI ट्यूटोरियल'}

आर्टिकल सामग्री (Article Content):
${strippedContent}

निर्देश:
1. आउटपुट केवल शुद्ध HTML फॉर्मेट में दें (बिना किसी \`\`\`html बैकग्राउंड टैग के)।
2. निम्नलिखित मुख्य सेक्शंस शामिल करें:
   - <h3>📌 मुख्य मुख्य बातें (Key Takeaways)</h3>: बुलेट पॉइंट्स में मुख्य बातें।
   - <h3>🛠️ प्रमुख टूल्स और फीचर्स (Tools & Features Overview)</h3>: यदि आर्टिकल में AI टूल्स का जिक्र है, तो एक सुंदर HTML <table> (columns: Tool Name, Features, Pricing) बनाएं, अन्यथा मुख्य फीचर्स का विश्लेषण दें।
   - <h3>📝 स्टेप-बाय-स्टेप सारांश (How-to / Steps)</h3>: ट्यूटोरियल के जरूरी स्टेप्स।
   - <h3>💡 एक्सपर्ट प्रो टिप्स और निष्कर्ष (Pro Tips & Summary)</h3>: यूजर्स के लिए उपयोगी टिप्स।
3. भाषा सरल, आकर्षक और हिंदी में होनी चाहिए।`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'आप Aitoolhindi.online के एक्सपर्ट AI ट्यूटर हैं। आपका काम तकनीकी AI विषयों को भारत के आम पाठकों के लिए सबसे आसान हिंदी में समझाना और सुंदर HTML सारांश प्रस्तुत करना है। सीधे HTML कोड दें, कोई अतिरिक्त प्रस्तावना या बैक-टिक्स न लगाएं।',
        },
      });

      const summaryHtml = cleanMarkdownHtml(response.text || '');

      return NextResponse.json({
        summary: summaryHtml,
      });
    }

    if (action === 'question') {
      const userQ = question || '';
      if (!userQ.trim()) {
        return NextResponse.json(
          { error: 'कृपया कोई प्रश्न दर्ज करें।' },
          { status: 400 }
        );
      }

      const prompt = `यूजर का सवाल: "${userQ}"

संदर्भ आर्टिकल का शीर्षक: ${keywordOrTitle || 'AI Tutorial'}
संदर्भ आर्टिकल सामग्री:
${strippedContent}

निर्देश:
1. यूजर के सवाल का सीधा, सटीक और मददगार उत्तर शुद्ध और आसान हिंदी में दें।
2. उत्तर को साफ़ HTML टैग्स (<p>, <ul>, <li>, <strong>) में फॉर्मेट करें।
3. कोड ब्लॉक (\`\`\`html) का प्रयोग न करें।`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'आप Aitoolhindi.online के AI असिस्टेंट हैं। उपयोगकर्ताओं के सवालों का सटीक और आदरपूर्वक हिंदी में समाधान करें।',
        },
      });

      const answerHtml = cleanMarkdownHtml(response.text || '');

      return NextResponse.json({
        answer: answerHtml,
      });
    }

    return NextResponse.json(
      { error: `अमान्य एक्शन: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Gemini API Error:', error);
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
