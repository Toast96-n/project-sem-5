import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

console.log("Key loaded:", !!process.env.GEMINI_API_KEY);
console.log("Key starts with:", process.env.GEMINI_API_KEY?.substring(0, 10));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

try {
    const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: "Say hello"
    });

    console.log(response.text);

} catch (error) {
    console.error(error);
}