// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD API — wired to the real backend.
//
// Scoped to the authenticated user by the backend: every total, score and event
// here is derived from the resumes the bearer token owns.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";
import type { Dashboard } from "@/types/api";

export const dashboardApi = {
  get: (): Promise<Dashboard> =>
    apiClient.get<Dashboard>("/dashboard").then((r) => r.data),
};
