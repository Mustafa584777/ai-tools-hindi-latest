import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { action, keywordOrTitle, content, question } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured on the server." },
        { status: 500 }
      );
    }

    let prompt = "";
    if (action === "summarize") {
      prompt = `आप एक विशेषज्ञ हिंदी AI ब्लॉगर हैं। निम्नलिखित लेख ("${keywordOrTitle}") का एक विस्तृत, आकर्षक और सुंदर हिंदी सारांश (HTML format में <p>, <ul>, <li>, <strong> टैग्स के साथ) तैयार करें। इसमें मुख्य बिंदु, फायदे/नुकसान (यदि लागू हो) और आसान हिंदी में स्पष्टीकरण शामिल करें:\n\n${content}`;
    } else if (action === "question") {
      prompt = `आप एक विशेषज्ञ हिंदी AI सहायक हैं। लेख ("${keywordOrTitle}") के संदर्भ में उपयोगकर्ता के निम्नलिखित प्रश्न का सटीक, मददगार और स्पष्ट उत्तर हिंदी में (<p> टैग के साथ HTML format में) दें:\n\nप्रश्न: ${question}\n\nलेख सामग्री:\n${content}`;
    } else {
      return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";

    if (action === "summarize") {
      return NextResponse.json({ summary: text });
    } else {
      return NextResponse.json({ answer: text });
    }
  } catch (error: any) {
    console.error("AI Supervisor error:", error);
    return NextResponse.json(
      { error: error?.message || "AI generation failed" },
      { status: 500 }
    );
  }
}
