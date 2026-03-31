import { GoogleGenAI } from "@google/genai";

export const getGeminiModel = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  const genAI = new GoogleGenAI({ apiKey });
  return genAI;
};
