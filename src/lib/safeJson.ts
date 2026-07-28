/**
 * Reads a JSON body without throwing when there isn't one.
 *
 * `Response.json()` throws "Unexpected end of JSON input" on an empty body — which is
 * exactly what a crashed route, a proxy error, or an auth redirect returns. That
 * message tells the user nothing, and it masks the real status code, so every fetch
 * should go through here instead.
 */
export async function safeJson<T = unknown>(response: Response): Promise<T | null> {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Best-effort error message from a failed response, with a status-aware fallback. */
export async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await safeJson<{ error?: string }>(response);
  if (body?.error) return body.error;

  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (response.status === 429) {
    return "You've reached your evaluation limit for today.";
  }
  return `${fallback} (HTTP ${response.status})`;
}
