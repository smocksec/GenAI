import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY // or whatever env var you set
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

main().catch(err => console.error("ERR:", err));
