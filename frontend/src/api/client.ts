// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT — Axios instance talking to the NestJS backend.
// ─────────────────────────────────────────────────────────────────────────────

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiError } from "@/types/common";

/**
 * Empty in development on purpose: requests then go to the Vite proxy, which
 * forwards `/api` to the backend and keeps the browser on one origin, so CORS
 * never enters the picture. Set it in production, where the two are served
 * from different hosts.
 */
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

/**
 * localStorage rather than memory: it survives a reload, which is what
 * `AuthContext` assumes when it calls `me()` on boot.
 */
const ACCESS_KEY = "ats.access_token";
const REFRESH_KEY = "ats.refresh_token";

export const tokenStore = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  save(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** The envelope every backend route answers with. */
interface Envelope<T> {
  message: string;
  data?: T;
  error?: { code: string; details?: unknown };
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
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

async function runRefresh(): Promise<string> {
  const refreshToken = tokenStore.refresh();
  if (!refreshToken) throw new Error("No refresh token stored");

  /**
   * Bare axios, not `apiClient`: going through the instance would put this call
   * through the very interceptor that is handling the failure.
   */
  const { data } = await axios.post<Envelope<{ access_token: string; refresh_token: string }>>(
    `${BASE_URL}/auth/refresh-token`,
    { refresh_token: refreshToken },
  );

  const envelope = data as Envelope<{ access_token: string; refresh_token: string }>;
  if (!envelope?.message) {
    throw new Error("Refresh response invalid: missing envelope structure");
  }

  const tokens = envelope.data;
  if (!tokens?.access_token || typeof tokens.access_token !== "string") {
    throw new Error("Refresh response invalid: missing or malformed access_token");
  }

  tokenStore.save(tokens.access_token, tokens.refresh_token);
  return tokens.access_token;
}

function toApiError(error: AxiosError<Envelope<unknown>>): ApiError {
  const body = error.response?.data;
  return {
    status: error.response?.status,
    message: body?.message || error.message || "Request failed",
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
      !NO_REFRESH.some((path) => (original.url ?? "").startsWith(path)) &&
      !!tokenStore.refresh();

    if (retriable && original) {
      original._retried = true;
      try {
        if (!refreshing) {
          refreshing = runRefresh().finally(() => {
            refreshing = null;
          });
        }
        const token = await refreshing;
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
