import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import AILogo from "@/components/layout/AILogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t } = useTranslation(["landing", "common"]);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const NAV_LINKS = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.dashboard"), href: "#dashboard-preview" },
    { label: t("nav.pricing"), href: "#pricing" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 inset-x-0 z-50 px-3 sm:px-6"
    >
      <div
        style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
        className={cn(
          "rounded-xl md:rounded-full border transition-all duration-300",
          scrolled
            ? "bg-[var(--card)]/85 border-[var(--border)] backdrop-blur-xl shadow-card"
            : "bg-[var(--card)]/95 border-transparent backdrop-blur-md",
        )}
      >
        <div className="flex items-center justify-between gap-4 px-3 sm:px-4 py-2">
          <Link to="/" className="flex items-center gap-2.5 pl-1">
            <AILogo />
            <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
              {t("brand")}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="cursor-pointer h-9 w-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label={t("common:actions.toggleTheme")}
              title={t("common:actions.toggleTheme")}
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <LanguageSwitcher className="hidden sm:block" />
            
            <Link
              to="/login"
              className="hidden sm:inline-flex h-9 px-4 rounded-full text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] items-center transition-colors"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              to="/register"
              className="group inline-flex items-center gap-1.5 h-9 pl-4 pr-3.5 rounded-full bg-[var(--foreground)] text-[var(--background)] text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {t("nav.getStarted")}
              <ArrowRight
                size={13}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <button
              onClick={() => setOpen((o) => !o)}
              className="md:hidden h-9 w-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)]"
              aria-label="Toggle menu"
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden border-t border-[var(--border)] px-3 py-3 space-y-1"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="block px-3 py-2 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              {t("nav.signIn")}
            </Link>
            <div className="pt-1">
              <LanguageSwitcher />
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
