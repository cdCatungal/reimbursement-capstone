import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const cleanExtractedText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "No text provided" });
    }

    // Use the latest Gemini 1.5 Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
You are an OCR text cleaner. 
Fix spacing, punctuation, remove noise like random line breaks, duplicated lines, misread characters, or broken words.
Keep the original meaning. 
Return ONLY the cleaned text. No explanations.

OCR Text:
"""
${text}
"""`;

    const result = await model.generateContent(prompt);
    const cleanedText = result.response.text()?.trim() || text.trim();

    return res.json({ cleanedText });
  } catch (error) {
    console.error("Gemini Cleanup Error:", error);
    res.status(500).json({
      message: "Text cleanup failed",
      error: error?.message || error,
    });
  }
};
