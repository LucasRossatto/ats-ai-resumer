import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from "@/i18n";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat("en-US", opts).format(n);
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return i18n.t("time.justNow", { ns: "common" });
  if (diff < 3600) return i18n.t("time.minutesAgo", { ns: "common", count: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t("time.hoursAgo", { ns: "common", count: Math.floor(diff / 3600) });
  if (diff < 604800) return i18n.t("time.daysAgo", { ns: "common", count: Math.floor(diff / 86400) });
  return d.toLocaleDateString();
}
