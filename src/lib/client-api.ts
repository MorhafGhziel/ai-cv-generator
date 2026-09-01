/**
 * Client-side fetch wrapper.
 *
 * The API always answers with JSON, including for errors, but a proxy or an
 * unexpected redirect can still return HTML. Parsing defensively means the user
 * sees "You've been signed out" rather than an unhandled JSON syntax error.
 */

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

const FALLBACKS: Record<number, string> = {
  401: "You've been signed out. Refresh the page and sign in again.",
  403: "You don't have access to that.",
  404: "That's no longer there.",
  413: "That file is too large.",
  429: "Slow down a moment — you've hit the rate limit.",
  500: "Something went wrong on our end. Please try again.",
  502: "The AI service didn't respond properly. Please try again.",
  503: "The AI service is unavailable right now.",
  504: "That took too long. Please try again.",
};

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON response — fall through to a status-based message.
    }
  }

  if (!res.ok) {
    const fromBody =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : null;
    throw new RequestError(
      res.status,
      fromBody ?? FALLBACKS[res.status] ?? "Something went wrong. Please try again.",
    );
  }

  return body as T;
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(url, { signal, headers: { Accept: "application/json" } }));
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method,
      signal,
      headers: body === undefined ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiUpload<T>(url: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(url, { method: "POST", body: formData, signal }));
}

/** Normalises anything thrown by the helpers above into a displayable string. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof RequestError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "";
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
