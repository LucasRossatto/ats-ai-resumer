import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastItem {
  id: number;
  title?: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastFn {
  (opts?: ToastOptions): number;
  success: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
  error: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
  info: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
}

export interface UIContextValue {
  toast: ToastFn;
  dismiss: (id: number) => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useToast() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useToast must be used inside UIProvider");
  return ctx.toast;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
