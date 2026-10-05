import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AILogo from "@/components/layout/AILogo";

function useColumns() {
  const { t } = useTranslation("landing");
  return [
    {
      title: t("footer.columns.product.title"),
      links: [
        { label: t("footer.columns.product.links.features"), href: "#features" },
        { label: t("footer.columns.product.links.howItWorks"), href: "#how-it-works" },
        { label: t("footer.columns.product.links.dashboard"), href: "#dashboard-preview" },
      ],
    },
  ];
}

export function Footer() {
  const { t } = useTranslation("landing");
  const COLUMNS = useColumns();
  return (
    <footer
      className="px-3 sm:px-6 mt-28 sm:mt-18 pb-12"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <div className="rounded-[28px] bg-[var(--card)] border border-[var(--border)] shadow-card p-8 sm:p-12">
        <div className="grid grid-cols-2 gap-8 sm:gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <AILogo />
              <span className="font-display text-[16px] font-semibold tracking-tight text-[var(--foreground)]">
                {t("brand")}
              </span>
            </Link>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-4 max-w-xs leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[13px] text-[var(--foreground)] font-semibold mb-4">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[var(--muted-foreground)]">
          <div>{t("footer.copyright")}</div>
          <div>{t("footer.statusOperational")}</div>
        </div>
      </div>
    </footer>
  );
}
