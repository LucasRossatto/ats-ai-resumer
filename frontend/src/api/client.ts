// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT — Axios instance talking to the NestJS backend.
// ─────────────────────────────────────────────────────────────────────────────

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import i18n from "@/i18n";
import type { ApiError } from "@/types/common";

/**
 * Empty in development on purpose: requests then go to the Vite proxy, which
 * forwards `/api` to the backend and keeps the browser on one origin, so CORS
 * never enters the picture. Set it in production, where the two are served
 * from different hosts.
 */
export const BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

/**
 * The access token lives in module memory only: nothing readable by script is
 * persisted. The refresh token is an httpOnly cookie the browser handles, so a
 * reload restores the session through `/auth/refresh-token`.
 */
let accessToken: string | null = null;

export const tokenStore = {
  access: () => accessToken,
  save(access: string) {
    accessToken = access;
  },
  clear() {
    accessToken = null;
  },
};

/** One-off cleanup of tokens an older build left in localStorage. */
try {
  localStorage.removeItem("ats.access_token");
  localStorage.removeItem("ats.refresh_token");
} catch {
  // storage unavailable: nothing to clean
}

/** The envelope every backend route answers with. */
interface Envelope<T> {
  message: string;
  data?: T;
  error?: { code: string; details?: unknown };
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.access();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Routes that must never trigger a refresh: two of them are how you get a token
 * in the first place, and retrying the refresh call itself is the loop this
 * guard exists to prevent.
 */
const NO_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  "/auth/logout",
];

/** In flight refresh, shared so N concurrent 401s wait on one call. */
let refreshing: Promise<string> | null = null;

/** Exchanges the refresh cookie for a new access token (no body is sent). */
export async function runRefresh(): Promise<string> {
  /**
   * Bare axios, not `apiClient`: going through the instance would put this call
   * through the very interceptor that is handling the failure.
   */
  const { data } = await axios.post<Envelope<{ access_token: string }>>(
    `${BASE_URL}/auth/refresh-token`,
    undefined,
    { withCredentials: true },
  );

  if (!data?.message) {
    throw new Error("Refresh response invalid: missing envelope structure");
  }

  const access = data.data?.access_token;
  if (!access || typeof access !== "string") {
    throw new Error("Refresh response invalid: missing or malformed access_token");
  }

  tokenStore.save(access);
  return access;
}

/** Single-flight wrapper, so N concurrent callers wait on one request. */
export function refreshOnce(): Promise<string> {
  if (!refreshing) {
    refreshing = runRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/**
 * Without an envelope the failure did not come from our API (proxy 502/503/504
 * with an HTML body, or no response at all), so axios' English text is replaced
 * by a translated one.
 */
function fallbackMessage(status?: number): string {
  const down = !status || status === 502 || status === 503 || status === 504;
  return i18n.t(down ? "common:errors.unavailable" : "common:errors.generic");
}

function toApiError(error: AxiosError<Envelope<unknown>>): ApiError {
  const body = error.response?.data;
  const status = error.response?.status;
  return {
    status,
    message: body?.message || fallbackMessage(status),
    code: body?.error?.code,
    details: body?.error?.details,
  };
}

apiClient.interceptors.response.use(
  (response) => {
    /**
     * Unwrap the envelope so callers read the payload directly. Only shapes
     * that actually carry `message` are touched, so a raw body from anywhere
     * else passes through untouched.
     */
    const body = response.data;
    if (body && typeof body === "object" && "message" in body && "data" in body) {
      response.data = (body as Envelope<unknown>).data;
    }
    return response;
  },
  async (error: AxiosError<Envelope<unknown>>) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const retriable =
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH.some((path) => (original.url ?? "").startsWith(path));

    if (retriable && original) {
      original._retried = true;
      try {
        const token = await refreshOnce();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        /** The refresh itself failed: the session is over, stop pretending. */
        tokenStore.clear();
      }
    }

    return Promise.reject(toApiError(error));
  },
);
