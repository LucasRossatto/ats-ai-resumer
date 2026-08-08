// ─────────────────────────────────────────────────────────────────────────────
// AUTH API — wired to the real backend.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient, tokenStore } from "./client";
import type { AuthResponse, AuthSession, OkResponse, User } from "@/types/api";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  lastname?: string;
  age?: number;
}

interface LoginPayload {
  email: string;
  password?: string;
}

/** Only what the profile route accepts: sending `email` is a 400. */
interface ProfilePayload {
  name?: string;
  lastname?: string;
}

/**
 * Login and register hand back the tokens next to the user. Storing them here
 * rather than in the caller keeps every entry point into a session going
 * through one place.
 */
async function startSession(session: AuthSession): Promise<AuthResponse> {
  tokenStore.save(session.access_token, session.refresh_token);
  return { user: session.user };
}

export const authApi = {
  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    apiClient
      .post<AuthSession>("/auth/register", payload)
      .then((r) => startSession(r.data)),

  login: (payload: LoginPayload): Promise<AuthResponse> =>
    apiClient
      .post<AuthSession>("/auth/login", payload)
      .then((r) => startSession(r.data)),

  /**
   * Clears the tokens whatever the server answers: a logout that fails on the
   * network still has to end the session in the browser.
   */
  logout: async (): Promise<OkResponse> => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Swallow error: session must end even if server is unreachable
    } finally {
      tokenStore.clear();
    }
    return { ok: true };
  },

  me: (): Promise<AuthResponse> =>
    apiClient.get<AuthResponse>("/auth/me").then((r) => r.data),

  updateProfile: (payload: ProfilePayload): Promise<AuthResponse> =>
    apiClient
      .patch<User>("/auth/profile", payload)
      .then((r) => ({ user: r.data })),

  /**
   * The backend revokes the refresh token on a password change, so the session
   * in this tab is already dead when this resolves. The caller logs out.
   */
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<OkResponse> =>
    apiClient.patch<OkResponse>("/auth/password", payload).then((r) => r.data),
};
