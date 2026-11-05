import { afterEach, describe, expect, it, vi } from "vitest";
import { cn, formatNumber, relativeTime } from "./utils";

describe("cn", () => {
  it("resolves conflicting tailwind classes in favor of the last one", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
  it("drops falsy values", () => {
    const off = false as boolean;
    expect(cn("a", off && "b", null, undefined, "c")).toBe("a c");
  });
});

describe("formatNumber", () => {
  it("groups thousands and honors options", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0.5, { style: "percent" })).toBe("50%");
  });
});

describe("relativeTime", () => {
  afterEach(() => vi.useRealTimers());

  it("renders a dash for missing or invalid dates", () => {
    expect(relativeTime()).toBe("—");
    expect(relativeTime(null)).toBe("—");
    expect(relativeTime("not-a-date")).toBe("—");
  });

  it("buckets by elapsed time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    const ago = (s: number) => new Date(Date.now() - s * 1000);
    const justNow = relativeTime(ago(10));
    const minutes = relativeTime(ago(5 * 60));
    const hours = relativeTime(ago(3 * 3600));
    const days = relativeTime(ago(2 * 86400));
    expect(new Set([justNow, minutes, hours, days]).size).toBe(4);
    expect(minutes).toContain("5");
    expect(hours).toContain("3");
    expect(days).toContain("2");
  });

  it("falls back to a locale date after a week", () => {
    const old = new Date(Date.now() - 30 * 86400 * 1000);
    expect(relativeTime(old)).toBe(old.toLocaleDateString());
  });
});
