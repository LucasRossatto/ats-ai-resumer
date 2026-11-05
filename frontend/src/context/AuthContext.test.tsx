import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, tokenStore } from "@/api/client";
import { fakeAdapter, ok, type FakeReply } from "@/test/http";
import { AuthProvider, useAuth } from "./AuthContext";

const user = { id: "u1", name: "Ana", email: "ana@x.com" };
const refreshOk = { data: { message: "ok", data: { access_token: "tok" } } };

let handler: (url: string) => FakeReply;
let queryClient: QueryClient;

function setup() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  tokenStore.clear();
  queryClient = new QueryClient();
  handler = (url) => (url === "/auth/me" ? ok({ user }) : ok({}));
  apiClient.defaults.adapter = fakeAdapter((config) => handler(config.url ?? ""));
});

afterEach(() => {
  vi.restoreAllMocks();
  tokenStore.clear();
});

describe("AuthProvider boot", () => {
  it("restores the session from refresh + me()", async () => {
    vi.spyOn(axios, "post").mockResolvedValue(refreshOk);
    const { result } = setup();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(tokenStore.access()).toBe("tok");
  });

  it("ends up logged out, quietly, when the refresh fails", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("no cookie"));
    const { result } = setup();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(tokenStore.access()).toBeNull();
  });

  it("ends up logged out when me() answers 401 after a good refresh", async () => {
    vi.spyOn(axios, "post").mockResolvedValue(refreshOk);
    handler = () => ({ status: 401, data: { message: "Unauthorized" } });
    const { result } = setup();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(tokenStore.access()).toBeNull();
  });
});

describe("AuthProvider login and logout", () => {
  async function booted() {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("no cookie"));
    const hook = setup();
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
  }

  it("login sets the user and the in-memory token", async () => {
    const { result } = await booted();
    handler = () => ok({ access_token: "login-tok", user });

    await act(() => result.current.login({ email: user.email, password: "pw" }));

    expect(result.current.user).toEqual(user);
    expect(tokenStore.access()).toBe("login-tok");
  });

  it("logout clears user, token and the react-query cache", async () => {
    const { result } = await booted();
    handler = () => ok({ access_token: "login-tok", user });
    await act(() => result.current.login({ email: user.email, password: "pw" }));
    queryClient.setQueryData(["resumes"], [1, 2]);

    handler = () => ok({});
    await act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(tokenStore.access()).toBeNull();
    expect(queryClient.getQueryData(["resumes"])).toBeUndefined();
  });

  it("logout clears the in-memory token even when the API fails", async () => {
    const { result } = await booted();
    handler = () => ok({ access_token: "login-tok", user });
    await act(() => result.current.login({ email: user.email, password: "pw" }));
    queryClient.setQueryData(["resumes"], [1]);

    handler = () => ({ status: 500, data: "<html>down</html>" });
    await act(() => result.current.logout());

    expect(tokenStore.access()).toBeNull();
    expect(result.current.user).toBeNull();
    expect(queryClient.getQueryData(["resumes"])).toBeUndefined();
  });
});
