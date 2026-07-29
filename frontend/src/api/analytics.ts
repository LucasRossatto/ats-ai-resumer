// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS API — backed by mocks while the backend is offline.
// TO ENABLE THE REAL BACKEND:
//   1. Uncomment each `apiClient.get(...)` line below.
//   2. Delete the mock implementation block underneath.
//   3. Delete the `import` from "@/mock/*".
// ─────────────────────────────────────────────────────────────────────────────

// import { apiClient } from "./client";
import { mockInsights, mockAllVersions, mockHistory } from "@/mock/analytics";
import { mockDelay } from "@/mock/_helpers";
import type { AllVersions, History, Insights } from "@/types/api";

export const analyticsApi = {
  // insights: () => apiClient.get("/insights").then((r) => r.data),
  insights: async (): Promise<Insights> => {
    await mockDelay();
    // mock/analytics.js is untyped boilerplate — its string-literal fields widen to `string`.
    return mockInsights as Insights;
  },

  // versions: () => apiClient.get("/versions").then((r) => r.data),
  versions: async (): Promise<AllVersions> => {
    await mockDelay();
    return mockAllVersions as AllVersions;
  },

  // history: () => apiClient.get("/history").then((r) => r.data),
  history: async (): Promise<History> => {
    await mockDelay();
    return mockHistory as History;
  },
};
