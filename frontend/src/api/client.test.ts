import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { fakeAdapter, ok, type FakeReply } from "@/test/http";
import { authApi } from "./auth";
import { apiClient, tokenStore } from "./client";

const refreshOk = (token: string) => ({ data: { message: "ok", data: { access_token: token } } });

let calls: { url?: string; auth?: string }[];
let handler: (url: string, auth?: string) => FakeReply;

beforeEach(() => {
  tokenStore.clear();
  calls = [];
  handler = () => ok({});
  apiClient.defaults.adapter = fakeAdapter((config) => {
    const auth = config.headers.Authorization as string | undefined;
    calls.push({ url: config.url, auth });
    return handler(config.url ?? "", auth);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  tokenStore.clear();
});

describe("apiClient refresh on 401", () => {
  it("runs a single refresh for concurrent 401s and replays every request with the new token", async () => {
    tokenStore.save("old");
    const refresh = vi.spyOn(axios, "post").mockResolvedValue(refreshOk("new"));
    handler = (_url, auth) => (auth === "Bearer new" ? ok({ fine: true }) : { status: 401 });

    const results = await Promise.all([
      apiClient.get("/a"),
      apiClient.get("/b"),
      apiClient.get("/c"),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.data)).toEqual([{ fine: true }, { fine: true }, { fine: true }]);
    expect(calls.filter((c) => c.auth === "Bearer new")).toHaveLength(3);
    expect(tokenStore.access()).toBe("new");
  });

  it.each(["/auth/login", "/auth/register", "/auth/refresh-token", "/auth/logout"])(
    "does not refresh when %s answers 401",
    async (url) => {
      const refresh = vi.spyOn(axios, "post");
      handler = () => ({ status: 401, data: { message: "nope", error: { code: "UNAUTHORIZED" } } });

      await expect(apiClient.post(url)).rejects.toMatchObject({ status: 401, message: "nope" });
      expect(refresh).not.toHaveBeenCalled();
      expect(calls).toHaveLength(1);
    },
  );

  it("clears the token, rejects and does not loop when the refresh fails", async () => {
    tokenStore.save("old");
    const refresh = vi.spyOn(axios, "post").mockRejectedValue(new Error("expired"));
    handler = () => ({ status: 401, data: { message: "Unauthorized" } });

    await expect(apiClient.get("/x")).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
    expect(tokenStore.access()).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it("does not refresh a second time when the replayed request is 401 again", async () => {
    tokenStore.save("old");
    const refresh = vi.spyOn(axios, "post").mockResolvedValue(refreshOk("new"));
    handler = () => ({ status: 401, data: { message: "still no" } });

    await expect(apiClient.get("/x")).rejects.toMatchObject({ status: 401, message: "still no" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("rejects when the refresh response has no access_token", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: { message: "ok", data: {} } });
    handler = () => ({ status: 401 });

    await expect(apiClient.get("/x")).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.access()).toBeNull();
  });
});

describe("apiClient error normalization", () => {
  it("normalizes a non-401 envelope error as ApiError", async () => {
    const refresh = vi.spyOn(axios, "post");
    handler = () => ({
      status: 409,
      data: { message: "Email taken", error: { code: "CONFLICT", details: { field: "email" } } },
    });

    await expect(apiClient.get("/x")).rejects.toEqual({
      status: 409,
      message: "Email taken",
      code: "CONFLICT",
      details: { field: "email" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("uses the translated generic fallback when there is no envelope", async () => {
    handler = () => ({ status: 500, data: "<html>boom</html>" });
    await expect(apiClient.get("/x")).rejects.toMatchObject({
      status: 500,
      message: i18n.t("common:errors.generic"),
    });
  });

  it("uses the translated unavailable fallback for 502/503/504", async () => {
    handler = () => ({ status: 503, data: "<html>bad gateway</html>" });
    await expect(apiClient.get("/x")).rejects.toMatchObject({
      status: 503,
      message: i18n.t("common:errors.unavailable"),
    });
  });

  it("unwraps the success envelope", async () => {
    handler = () => ok({ id: 1 });
    expect((await apiClient.get("/x")).data).toEqual({ id: 1 });
  });
});

describe("apiClient Authorization header", () => {
  it("sends the bearer token when there is one", async () => {
    tokenStore.save("tok");
    await apiClient.get("/x");
    expect(calls[0].auth).toBe("Bearer tok");
  });

  it("sends no Authorization header without a token", async () => {
    await apiClient.get("/x");
    expect(calls[0].auth).toBeUndefined();
  });
});

describe("token persistence", () => {
  it("never writes a token to localStorage after login or refresh", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(axios, "post").mockResolvedValue(refreshOk("fresh"));

    handler = () => ok({ access_token: "login-tok", user: { id: "1" } });
    await authApi.login({ email: "a@b.c", password: "x" });
    expect(tokenStore.access()).toBe("login-tok");

    tokenStore.clear();
    handler = (_u, auth) => (auth === "Bearer fresh" ? ok({}) : { status: 401 });
    await apiClient.get("/x");
    expect(tokenStore.access()).toBe("fresh");

    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/login-tok|fresh/);
  });

  // Last on purpose: resetModules makes later imports see a fresh client instance.
  it("removes the legacy localStorage keys once, on module load", async () => {
    localStorage.setItem("ats.access_token", "a");
    localStorage.setItem("ats.refresh_token", "r");
    vi.resetModules();
    await import("./client");
    expect(localStorage.getItem("ats.access_token")).toBeNull();
    expect(localStorage.getItem("ats.refresh_token")).toBeNull();
  });
});
