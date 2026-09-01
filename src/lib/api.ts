import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AIError } from "@/lib/ai";
import { reserveQuota, type RateLimitedAction } from "@/lib/rate-limit";

/**
 * Shared plumbing for route handlers: authentication, body validation, rate
 * limiting, and — importantly — error responses that never echo internal
 * details (provider names, stack traces, connection strings) to the client.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiError(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/** Resolves the signed-in user id, or throws a 401 `ApiError`. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "You need to be signed in to do that.");
  return session.user.id;
}

/** Parses and validates a JSON body. Malformed JSON becomes a clean 400. */
export async function readJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    throw new ApiError(400, `${where}${first?.message ?? "Invalid request body."}`);
  }
  return parsed.data;
}

/** Claims one unit of quota for `action`, or throws a 429. */
export async function consumeQuota(userId: string, action: RateLimitedAction): Promise<void> {
  const result = await reserveQuota(userId, action);
  if (!result.ok) {
    throw new ApiError(429, result.message ?? "Too many requests. Try again shortly.", {
      "Retry-After": String(result.retryAfter),
    });
  }
}

/**
 * Wraps a handler so every thrown error becomes a well-formed JSON response.
 * Unexpected errors are logged server-side and reported to the client as a
 * generic message — the original is never serialised into the response.
 */
export function handler<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.status, error.message, error.headers);
      }
      if (error instanceof AIError) {
        // Already a user-facing message; the provider detail stayed in the logs.
        return apiError(error.status, error.message);
      }
      console.error(`[api] ${req.method} ${new URL(req.url).pathname} failed:`, error);
      return apiError(500, "Something went wrong on our end. Please try again.");
    }
  };
}
