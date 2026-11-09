import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { GoogleSignIn } from "./GoogleSignIn";

const okReply = () => new Response(JSON.stringify({ data: { status: "ok" } }), { status: 200 });
// What the host serves while the API wakes up: an HTML page, even with a 200.
const wakingReply = () => new Response("<html>Service waking up</html>", { status: 200 });

let awake: boolean;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  awake = true;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => (awake ? okReply() : wakingReply()));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const button = () => screen.getByRole("button", { name: "Continue with Google" });

describe("GoogleSignIn", () => {
  it("pings the API once in the background when it mounts, without credentials", async () => {
    render(<GoogleSignIn navigate={vi.fn()} />);
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/health");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  });

  it("does not break when the background ping fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<GoogleSignIn navigate={vi.fn()} />);
    await act(async () => {});

    expect(button()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("goes straight to Google when the API is awake, without a waiting screen", async () => {
    const navigate = vi.fn();
    render(<GoogleSignIn navigate={navigate} />);

    fireEvent.click(button());
    await act(async () => {});

    expect(navigate).toHaveBeenCalledWith("/api/v1/auth/google");
  });

  it("stays in the app while the API sleeps and navigates only once it answers", async () => {
    awake = false;
    const navigate = vi.fn();
    render(<GoogleSignIn navigate={navigate} />);

    fireEvent.click(button());
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(navigate).not.toHaveBeenCalled();
    expect(button()).toBeDisabled();
    expect(button()).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    awake = true;
    await act(async () => vi.advanceTimersByTimeAsync(3500));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/api/v1/auth/google");
  });

  it("ignores a second click while it is waiting", async () => {
    awake = false;
    render(<GoogleSignIn navigate={vi.fn()} />);

    fireEvent.click(button());
    await act(async () => vi.advanceTimersByTimeAsync(100));
    const calls = fetchMock.mock.calls.length;
    fireEvent.click(button());
    await act(async () => {});

    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("gives up after the total time, shows an error and never navigates", async () => {
    awake = false;
    const navigate = vi.fn();
    render(<GoogleSignIn navigate={navigate} />);

    fireEvent.click(button());
    await act(async () => vi.advanceTimersByTimeAsync(95_000));

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not wake the server up");
    expect(button()).toBeEnabled();
  });

  it("treats a hung attempt as asleep and keeps trying", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    render(<GoogleSignIn navigate={vi.fn()} />);

    fireEvent.click(button());
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    // 1 warm-up + several timed-out attempts
    expect(fetchMock.mock.calls.length).toBeGreaterThan(3);
  });

  it("stops trying when the screen goes away", async () => {
    awake = false;
    const { unmount } = render(<GoogleSignIn navigate={vi.fn()} />);

    fireEvent.click(button());
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    unmount();
    const calls = fetchMock.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("is translated", async () => {
    await i18n.changeLanguage("pt-BR");
    render(<GoogleSignIn navigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Continuar com o Google" })).toBeInTheDocument();
    expect(screen.getByText("ou")).toBeInTheDocument();
  });
});
