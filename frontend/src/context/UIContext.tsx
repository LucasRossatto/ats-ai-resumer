import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem {
  id: number;
  title?: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastFn {
  (opts?: ToastOptions): number;
  success: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
  error: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
  info: (title?: string, description?: string, opts?: Partial<ToastOptions>) => number;
}

interface UIContextValue {
  toast: ToastFn;
  dismiss: (id: number) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

const VARIANTS: Record<ToastVariant, { icon: typeof CheckCircle2; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-[var(--success)] bg-[var(--accent)]",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-[var(--destructive)] bg-[#F8E3E0]",
  },
  info: {
    icon: Info,
    iconClass: "text-[var(--primary-strong)] bg-[var(--accent)]",
  },
};

let _id = 0;
const nextId = () => ++_id;

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4200 }: ToastOptions = {}) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  ) as ToastFn;

  // Convenience helpers
  toast.success = (title, description, opts) =>
    toast({ title, description, variant: "success", ...opts });
  toast.error = (title, description, opts) =>
    toast({ title, description, variant: "error", ...opts });
  toast.info = (title, description, opts) =>
    toast({ title, description, variant: "info", ...opts });

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
    };
  }, []);

  return (
    <UIContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </UIContext.Provider>
  );
}

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

function ToastViewport({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-50 flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-32px)]">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const variant = VARIANTS[t.variant] || VARIANTS.info;
          const Icon = variant.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.18 } }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
              className="pointer-events-auto bg-[var(--card)] border border-[var(--border)] shadow-hover rounded-2xl p-3.5 flex items-start gap-3"
            >
              <div
                className={cn(
                  "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center",
                  variant.iconClass
                )}
              >
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <div className="text-sm font-semibold text-[var(--foreground)] leading-tight">
                    {t.title}
                  </div>
                )}
                {t.description && (
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-snug">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="h-7 w-7 rounded-full hover:bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] shrink-0"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
