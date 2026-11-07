import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, tokenStore } from "@/api/client";
import { AuthProvider } from "@/context/AuthContext";
import i18n from "@/i18n";
import { fakeAdapter, ok } from "@/test/http";
import AuthCallback from "./AuthCallback";

const user = { id: "u1", name: "Ana", email: "ana@x.com" };

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<p>dashboard page</p>} />
            <Route path="/login" element={<p>login page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  tokenStore.clear();
  apiClient.defaults.adapter = fakeAdapter(() => ok({ user }));
});

afterEach(() => {
  vi.restoreAllMocks();
  tokenStore.clear();
});

describe("AuthCallback", () => {
  it("shows the translated invalid_state message with a link back to login", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("boot: no cookie"));
    renderAt("/auth/callback?error=invalid_state");

    expect(await screen.findByRole("alert")).toHaveTextContent(i18n.t("auth:callback.invalidState"));
    const link = screen.getByRole("link", { name: i18n.t("auth:callback.backToLogin") });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
  });

  it("refreshes, loads the user and navigates to /dashboard", async () => {
    const refresh = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { message: "ok", data: { access_token: "tok" } } });
    renderAt("/auth/callback");

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(tokenStore.access()).toBe("tok");
  });

  it("shows the failure message and the login link when the refresh fails", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("no cookie"));
    renderAt("/auth/callback");

    expect(await screen.findByRole("alert")).toHaveTextContent(i18n.t("auth:callback.failed"));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: i18n.t("auth:callback.backToLogin") })).toHaveAttribute(
        "href",
        "/login",
      ),
    );
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
  });
});
