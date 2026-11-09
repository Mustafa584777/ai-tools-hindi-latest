import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(req: NextRequest) {
  try {
    const { action, keywordOrTitle, content, question } = await req.json();

    if (!ai) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    if (action === 'summarize') {
      const prompt = `आप एक विशेषज्ञ AI लेखक और ट्यूटोरियल गाइड हैं। निम्नलिखित हिंदी लेख (${keywordOrTitle}) का एक स्पष्ट, विस्तृत और आकर्षक सारांश (summary) HTML फॉर्मेट में (जैसे <h3>, <p>, <ul>, <li>, <strong>) हिंदी में लिखें जो पढ़ने में बेहद आसान और उपयोगी हो:\n\n${content}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return NextResponse.json({ summary: response.text });
    }

    if (action === 'question') {
      const prompt = `आप aitoolhindi.online के AI सहायक हैं। उपयोगकर्ता का प्रश्न इस लेख "${keywordOrTitle}" के संदर्भ में है।\n\nलेख का संदर्भ:\n${content.slice(0, 4000)}\n\nउपयोगकर्ता का प्रश्न: "${question}"\n\nकृपया इस प्रश्न का सटीक, स्पष्ट और मददगार उत्तर शुद्ध हिंदी में HTML फॉर्मेट (<p>, <ul>, <li>, <strong>) में दें।`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return NextResponse.json({ answer: response.text });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Supervisor API Error:', error);
    return NextResponse.json({ error: error.message || 'AI request failed' }, { status: 500 });
  }
}
