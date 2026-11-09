/**
 * The free Render plan puts the API to sleep, and while it wakes up the host
 * answers with its own HTML page. A full-page navigation (the Google sign-in)
 * would land the user there, so the app wakes the API with `fetch` first and
 * only navigates once it really answers.
 */
export const HEALTH_URL = `${import.meta.env.VITE_API_URL ?? ""}/health`;

const ATTEMPT_TIMEOUT_MS = 8_000;
const RETRY_INTERVAL_MS = 3_000;
const TOTAL_TIMEOUT_MS = 90_000;

/**
 * True only for a JSON body reporting `status: "ok"` (wrapped or not): the
 * waking page of the host is HTML and must not count, whatever its status.
 */
export async function isApiAwake(timeoutMs = ATTEMPT_TIMEOUT_MS, signal?: AbortSignal): Promise<boolean> {
  const attempt = new AbortController();
  const timer = setTimeout(() => attempt.abort(), timeoutMs);
  const onAbort = () => attempt.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(HEALTH_URL, { credentials: "omit", cache: "no-store", signal: attempt.signal });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.data?.status === "ok" || body?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Retries until the API answers, the total time runs out or `signal` aborts. */
export async function waitForApi(
  signal?: AbortSignal,
  { intervalMs = RETRY_INTERVAL_MS, totalMs = TOTAL_TIMEOUT_MS } = {},
): Promise<boolean> {
  const start = Date.now();
  while (!signal?.aborted && Date.now() - start < totalMs) {
    if (await isApiAwake(ATTEMPT_TIMEOUT_MS, signal)) return true;
    await sleep(intervalMs, signal);
  }
  return false;
}
