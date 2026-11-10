import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Sun, Moon } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "./NotificationsPopover";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { t } = useTranslation("layout");
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || t("topbar.greetingFallback");

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);

  return (
    <header className="flex items-center md:items-start justify-between gap-3 md:gap-6 mb-6 md:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-xl md:text-[clamp(28px,3vw,38px)] font-semibold leading-tight text-[var(--foreground)] truncate md:whitespace-normal">
          {t("topbar.greeting", { name: firstName })}
        </h1>
        <p className="hidden md:block text-sm text-[var(--muted-foreground)] mt-1">
          {t("topbar.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden lg:flex items-center gap-3 h-11 w-[360px] rounded-full bg-[var(--card)] border border-[var(--border)] pl-5 pr-1.5 shadow-card transition-shadow hover:shadow-hover text-left"
        >
          <Search size={16} className="text-[var(--muted-foreground)] shrink-0" />
          <span className="flex-1 text-sm text-[var(--muted-foreground)] truncate">
            {t("topbar.searchPlaceholder")}
          </span>
          <kbd className="inline-flex items-center gap-0.5 text-[10px] px-2 h-7 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] font-semibold">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>

        <IconButton
          onClick={onOpenPalette}
          title={t("topbar.search")}
          aria-label={t("topbar.search")}
          className="lg:hidden"
        >
          <Search size={16} />
        </IconButton>

        {/* Below md the theme lives in Settings > Appearance, reached via the avatar. */}
        <IconButton
          onClick={toggle}
          title={t("common:actions.toggleTheme")}
          aria-label={t("common:actions.toggleTheme")}
          className="hidden md:inline-flex"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </IconButton>
        <NotificationsPopover />

        {/* The sidebar holds Settings on desktop; below md this is the way there. */}
        <NavLink
          to="/settings"
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
          className={({ isActive }) =>
            cn(
              "md:hidden h-11 w-11 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] font-semibold flex items-center justify-center text-sm shrink-0",
              isActive && "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]",
            )
          }
        >
          {user?.name?.[0]?.toUpperCase() || "R"}
        </NavLink>
      </div>
    </header>
  );
}
