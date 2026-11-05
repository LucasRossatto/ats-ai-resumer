// .ts on purpose (createElement, no JSX): the provider and the `useAuth` hook
// live together, which react-refresh/only-export-components rejects in a .tsx.
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { refreshOnce, tokenStore } from "@/api/client";
import type { User } from "@/types/api";
import type { Nullable } from "@/types/common";

interface Credentials {
  email: string;
  password?: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/**
 * Narrower than `Partial<User>` on purpose: the profile route rejects anything
 * outside these two, and `email` in particular is the field a wider type kept
 * letting through into a 400.
 */
interface ProfilePayload {
  name?: string;
  lastname?: string;
}

interface AuthContextValue {
  user: Nullable<User>;
  loading: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  updateProfile: (payload: ProfilePayload) => Promise<User>;
  logout: () => Promise<void>;
  /** Restores the session from the refresh cookie and loads the user. Rejects when there is none. */
  refresh: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Nullable<User>>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    await refreshOnce();
    const { user } = await authApi.me();
    setUser(user);
    return user;
  }, []);

  /** Boot: the access token is memory only, so the cookie restores the session. */
  useEffect(() => {
    let alive = true;
    refreshOnce()
      .then(() => authApi.me())
      .then(({ user }) => alive && setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const { user } = await authApi.login(credentials);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user } = await authApi.register(payload);
    setUser(user);
    return user;
  }, []);

  const updateProfile = useCallback(async (payload: ProfilePayload) => {
    const { user } = await authApi.updateProfile(payload);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, refresh, updateProfile } },
    children,
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
