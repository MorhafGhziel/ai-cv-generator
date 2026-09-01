import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { z } from "zod";

/**
 * Provider fan-out for the two free-tier APIs the app runs on.
 *
 * Design constraints:
 *  - Every attempt is bounded by a deadline. The previous version could chain
 *    six models with retries and outlive the serverless function, returning
 *    nothing; now the whole call shares one budget and gives up cleanly.
 *  - Providers are asked for JSON natively (Gemini `responseMimeType`, Groq
 *    `response_format`) instead of being trusted to avoid code fences.
 *  - Provider errors never reach the client. They are logged server-side and
 *    surfaced as one of a small set of user-readable messages.
 */

/** Total wall-clock budget. Sits under the 60s Vercel Hobby ceiling. */
const TOTAL_BUDGET_MS = 50_000;
/** Ceiling for any single provider attempt. */
const ATTEMPT_TIMEOUT_MS = 22_000;
/** An attempt is only worth starting if this much budget remains. */
const MIN_ATTEMPT_MS = 4_000;

/**
 * Model ids rot. Providers retire them on their own schedule, and a hardcoded
 * list turns that into a silent outage — every call 404s and the app reports a
 * generic "temporarily unavailable".
 *
 * So: explicit versions rather than `-latest` aliases (which route to shared,
 * frequently-congested pools and returned 503s here), and both lists can be
 * overridden from the environment without a deploy.
 *
 * To see what a key can actually call:
 *   Gemini — GET https://generativelanguage.googleapis.com/v1beta/models?key=...
 *   Groq   — GET https://api.groq.com/openai/v1/models  (Bearer auth)
 */
function modelsFromEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = raw.split(",").map((m) => m.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

// Ordered by what actually answers, not by version number. The newest flash
// tiers sit behind a shared free-tier pool and return 503 "high demand" far
// more often than they succeed, so they are not in the default chain — add them
// via GEMINI_MODELS if that changes.
const GEMINI_MODELS = modelsFromEnv("GEMINI_MODELS", [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
]);

const GROQ_MODELS = modelsFromEnv("GROQ_MODELS", [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
]);

type AIFailureReason =
  | "unconfigured"
  | "no_model"
  | "rate_limited"
  | "timeout"
  | "bad_output"
  | "unavailable";

export class AIError extends Error {
  constructor(
    readonly reason: AIFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "AIError";
  }

  get status(): number {
    switch (this.reason) {
      case "unconfigured":
      case "no_model":
        return 503;
      case "rate_limited":
        return 429;
      case "timeout":
        return 504;
      default:
        return 502;
    }
  }

  static forReason(reason: AIFailureReason): AIError {
    const messages: Record<AIFailureReason, string> = {
      unconfigured: "The AI service isn't configured yet. Add an API key and try again.",
      no_model:
        "None of the configured AI models exist any more — providers retire them periodically. The model list needs updating; this isn't something you can fix from here.",
      rate_limited:
        "The free AI tier is busy right now — every model hit its rate limit. Give it a minute and try again.",
      timeout: "The AI took too long to respond. Try again, or shorten the job description.",
      bad_output:
        "The AI returned something we couldn't read. Try again — it usually works on the second attempt.",
      unavailable: "The AI service is temporarily unavailable. Please try again in a moment.",
    };
    return new AIError(reason, messages[reason]);
  }
}

function isRateLimit(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("429") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("resource_exhausted")
  );
}

/**
 * A retired or misspelled model id. Worth distinguishing from a transient
 * outage: no amount of retrying fixes it, and the operator needs to know the
 * list is stale rather than seeing "temporarily unavailable" forever.
 */
function isModelGone(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("model_not_found") ||
    m.includes("decommissioned") ||
    m.includes("is no longer") ||
    m.includes("does not exist") ||
    (m.includes("404") && m.includes("model"))
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** Truncates provider errors before they reach the logs, which can be verbose. */
function short(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.slice(0, 200);
}

interface Attempt {
  provider: string;
  model: string;
  run: (prompt: string, signal: AbortSignal) => Promise<string>;
}

/** Builds the ordered fallback chain from whichever keys are configured. */
function buildAttempts(): Attempt[] {
  const attempts: Attempt[] = [];

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    const client = new GoogleGenerativeAI(geminiKey);
    for (const model of GEMINI_MODELS) {
      attempts.push({
        provider: "gemini",
        model,
        run: async (prompt, signal) => {
          const result = await client
            .getGenerativeModel({
              model,
              generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
            })
            .generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }, { signal });
          return result.response.text();
        },
      });
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const client = new Groq({ apiKey: groqKey });
    for (const model of GROQ_MODELS) {
      attempts.push({
        provider: "groq",
        model,
        run: async (prompt, signal) => {
          const completion = await client.chat.completions.create(
            {
              model,
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.7,
              max_tokens: 8192,
            },
            { signal },
          );
          return completion.choices[0]?.message?.content ?? "";
        },
      });
    }
  }

  return attempts;
}

/**
 * Runs the prompt against each configured model in turn until one returns
 * text, respecting the shared deadline.
 *
 * `deadline` is passed in rather than computed here so that a retry does not
 * get a fresh budget — otherwise two passes could together outlast the
 * function's own `maxDuration` and be killed mid-flight.
 */
async function generateText(prompt: string, deadline: number): Promise<string> {
  const attempts = buildAttempts();
  if (attempts.length === 0) throw AIError.forReason("unconfigured");

  let sawRateLimit = false;
  let sawTimeout = false;
  let goneCount = 0;
  let attempted = 0;

  for (const attempt of attempts) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    attempted++;

    try {
      const text = await attempt.run(prompt, controller.signal);
      if (text.trim()) return text;
      console.warn(`[ai] ${attempt.provider}/${attempt.model} returned empty output`);
    } catch (error) {
      if (isAbort(error)) {
        sawTimeout = true;
        console.warn(`[ai] ${attempt.provider}/${attempt.model} timed out`);
      } else {
        const msg = short(error);
        if (isRateLimit(msg)) sawRateLimit = true;
        if (isModelGone(msg)) goneCount++;
        console.warn(`[ai] ${attempt.provider}/${attempt.model} failed: ${msg}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // Every model we managed to try is gone — the list is stale, not the service.
  if (attempted > 0 && goneCount === attempted) {
    console.error(
      "[ai] every configured model was rejected as missing or retired. " +
        "Set GEMINI_MODELS / GROQ_MODELS, or update the defaults in src/lib/ai.ts.",
    );
    throw AIError.forReason("no_model");
  }

  if (sawRateLimit) throw AIError.forReason("rate_limited");
  if (sawTimeout) throw AIError.forReason("timeout");
  throw AIError.forReason("unavailable");
}

const QUOTE = String.fromCharCode(34);

/**
 * Pulls the first balanced JSON value out of a model response.
 *
 * Even in JSON mode a model occasionally wraps output in fences or adds a
 * sentence. Scanning for balanced delimiters (while respecting string literals)
 * is far more reliable than an indexOf/lastIndexOf slice, which breaks on any
 * trailing prose containing a brace.
 */
function extractJson(text: string): string | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) return null;

  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === QUOTE) {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }

  // Unterminated (the model was cut off mid-object) — let the caller retry.
  return null;
}

/**
 * Generates JSON and validates it against `schema`. Retries once on
 * unparseable output, since a second sample almost always succeeds.
 */
export async function generateJSON<T extends z.ZodTypeAny>(
  prompt: string,
  schema: T,
  { retries = 1 }: { retries?: number } = {},
): Promise<z.infer<T>> {
  let lastIssue = "";
  // One budget for the whole call, retries included.
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0 && deadline - Date.now() < MIN_ATTEMPT_MS) break;

    const text = await generateText(
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response could not be parsed (${lastIssue}). Respond with ONLY the raw JSON value — no prose, no markdown fences.`,
      deadline,
    );

    const json = extractJson(text);
    if (!json) {
      lastIssue = "no complete JSON value found";
      console.warn("[ai] response contained no parseable JSON");
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      lastIssue = "malformed JSON syntax";
      console.warn("[ai] JSON.parse failed on extracted value");
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastIssue = result.error.issues[0]?.message ?? "unexpected shape";
    console.warn(`[ai] schema validation failed: ${lastIssue}`);
  }

  throw AIError.forReason("bad_output");
}
