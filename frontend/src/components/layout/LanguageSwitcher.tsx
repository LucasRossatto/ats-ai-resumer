import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

const LABEL_KEY: Record<SupportedLanguage, string> = {
  "pt-BR": "language.ptBR",
  en: "language.en",
};

const SHORT_LABEL: Record<SupportedLanguage, string> = {
  "pt-BR": "PT",
  en: "EN",
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = (
    SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
      ? i18n.language
      : "pt-BR"
  ) as SupportedLanguage;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(lng: SupportedLanguage) {
    i18n.changeLanguage(lng);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        aria-label={t("language.label")}
        title={t("language.label")}
      >
        <Globe size={15} />
        {SHORT_LABEL[current]}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] z-40 w-44 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-hover overflow-hidden p-1"
            role="listbox"
            aria-label={t("language.label")}
          >
            {SUPPORTED_LANGUAGES.map((lng) => (
              <button
                key={lng}
                role="option"
                aria-selected={lng === current}
                onClick={() => select(lng)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-left transition-colors hover:bg-[var(--muted)]",
                  lng === current
                    ? "text-[var(--primary-strong)]"
                    : "text-[var(--foreground)]"
                )}
              >
                {t(LABEL_KEY[lng])}
                {lng === current && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
