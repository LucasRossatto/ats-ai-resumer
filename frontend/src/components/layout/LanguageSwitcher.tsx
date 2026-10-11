import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

const SHORT_LABEL: Record<SupportedLanguage, string> = {
  "pt-BR": "PT-BR",
  en: "EN",
};

const DESCRIPTION_KEY: Record<SupportedLanguage, string> = {
  "pt-BR": "language.ptBRDescription",
  en: "language.enDescription",
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(lng: SupportedLanguage) {
    if (lng === current) return;
    i18n.changeLanguage(lng);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer h-9 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
        aria-label={t("language.label")}
        title={t("language.label")}
      >
        <Globe size={15} />
        {SHORT_LABEL[current]}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 md:left-0 top-[calc(100%+32px)] z-50 w-[calc(100vw-2rem)] md:w-fit  rounded-4xl bg-[var(--card)] shadow-[0_16px_40px_rgba(6,10,30,0.25)] p-4 md:p-6"
          >
            <div
              className="absolute -top-[5px] left-4 md:left-6 w-3.5 h-3.5 bg-[var(--card)] rounded-[1px]"
              style={{
                transform: "rotate(45deg)",
                boxShadow: "-2px -2px 4px rgba(6, 10, 30, 0.06)",
              }}
            />
            <h1 className="m-0 text-lg font-semibold text-[var(--foreground)] mb-1 leading-none">
              {t("language.label")}
            </h1>
            <p className="m-0 text-sm text-[var(--muted-foreground)] mb-4 md:mb-4">
              {t("language.selectDescription")}
            </p>

            <div className="box-border w-fit h-fit shrink-0 flex flex-row gap-3 justify-start items-start">
              {SUPPORTED_LANGUAGES.map((lng) => (
                <button
                  key={lng}
                  onClick={() => select(lng)}
                  type="button"
                  className={cn(
                    "relative cursor-pointer box-border w-25.25 shrink-0 h-26 flex flex-col gap-2 p-4 justify-start items-start rounded-[18px] font-medium text-left overflow-hidden",
                    lng === current
                      ? "text-white"
                      : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  {lng === current && (
                    <motion.span
                      layoutId="language-switcher-active-bg"
                      className="absolute inset-0 bg-[var(--primary)] rounded-[18px]"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <strong className="relative text-base whitespace-nowrap">
                    {SHORT_LABEL[lng]}
                  </strong>
                  <span
                    className={cn(
                      "relative text-sm w-full line-clamp-2",
                      lng === current ? "text-white/90" : "text-muted-foreground"
                    )}
                  >
                    {t(DESCRIPTION_KEY[lng])}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
