import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

function isRateLimitError(message: string): boolean {
  return message.includes("429") || message.includes("quota") || message.includes("rate") || message.includes("limit");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryWithRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (retries > 0 && isRateLimitError(msg)) {
      console.log(`Rate limited, retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return tryWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function generateWithAI(prompt: string): Promise<string> {
  const errors: string[] = [];

  // Try Gemini models first
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    const genAI = new GoogleGenerativeAI(geminiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`Trying Gemini: ${modelName}`);
        const result = await tryWithRetry(async () => {
          const model = genAI.getGenerativeModel({ model: modelName });
          return model.generateContent(prompt);
        });
        return result.response.text();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`Gemini ${modelName} failed: ${msg.slice(0, 100)}`);
        errors.push(`Gemini/${modelName}: ${msg.slice(0, 80)}`);
        continue;
      }
    }
  }

  // Try Groq models as fallback
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey });
    for (const modelName of GROQ_MODELS) {
      try {
        console.log(`Trying Groq: ${modelName}`);
        const result = await tryWithRetry(async () => {
          return groq.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
          });
        });
        return result.choices[0]?.message?.content || "";
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`Groq ${modelName} failed: ${msg.slice(0, 100)}`);
        errors.push(`Groq/${modelName}: ${msg.slice(0, 80)}`);
        continue;
      }
    }
  }

  // Nothing worked
  throw new Error("All AI providers are rate limited. Please wait a minute and try again.");
}
