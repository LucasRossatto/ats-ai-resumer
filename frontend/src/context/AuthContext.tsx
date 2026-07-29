import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import type { User } from "@/types/api";
import type { Nullable } from "@/types/common";

interface Credentials {
  email: string;
  password?: string;
}

interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
}

interface AuthContextValue {
  user: Nullable<User>;
  loading: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  updateProfile: (payload: Partial<User>) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Nullable<User>>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const updateProfile = useCallback(async (payload: Partial<User>) => {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
