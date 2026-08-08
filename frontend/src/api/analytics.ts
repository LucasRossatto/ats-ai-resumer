// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS API — wired to the real backend.
//
// The three routes aggregate over the resumes of the authenticated user, so the
// bearer token is what bounds every count, trend and event listed here.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";
import type { AllVersions, History, Insights } from "@/types/api";

export const analyticsApi = {
  insights: (): Promise<Insights> =>
    apiClient.get<Insights>("/insights").then((r) => r.data),

  versions: (): Promise<AllVersions> =>
    apiClient.get<AllVersions>("/versions").then((r) => r.data),

  history: (): Promise<History> =>
    apiClient.get<History>("/history").then((r) => r.data),
};
