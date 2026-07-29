import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

function useTestimonials() {
  const { t } = useTranslation("landing");
  return [
    {
      quote: t("testimonials.items.priya.quote"),
      name: "Priya Raman",
      role: t("testimonials.items.priya.role"),
      company: t("testimonials.items.priya.company"),
      initials: "PR",
    },
    {
      quote: t("testimonials.items.marcus.quote"),
      name: "Marcus Chen",
      role: t("testimonials.items.marcus.role"),
      company: t("testimonials.items.marcus.company"),
      initials: "MC",
    },
    {
      quote: t("testimonials.items.sofia.quote"),
      name: "Sofia Ruiz",
      role: t("testimonials.items.sofia.role"),
      company: t("testimonials.items.sofia.company"),
      initials: "SR",
    },
    {
      quote: t("testimonials.items.daniel.quote"),
      name: "Daniel Park",
      role: t("testimonials.items.daniel.role"),
      company: t("testimonials.items.daniel.company"),
      initials: "DP",
    },
    {
      quote: t("testimonials.items.aisha.quote"),
      name: "Aisha Hassan",
      role: t("testimonials.items.aisha.role"),
      company: t("testimonials.items.aisha.company"),
      initials: "AH",
    },
    {
      quote: t("testimonials.items.jordan.quote"),
      name: "Jordan Blake",
      role: t("testimonials.items.jordan.role"),
      company: t("testimonials.items.jordan.company"),
      initials: "JB",
    },
  ];
}

export function TestimonialsSection() {
  const { t } = useTranslation("landing");
  const TESTIMONIALS = useTestimonials();
  return (
    <section
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        title={<>{t("testimonials.title")}</>}
        sub={t("testimonials.sub")}
      />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
            className="rounded-[22px] bg-[var(--card)] border border-[var(--border)] shadow-card hover:shadow-hover transition-all p-5 sm:p-6 flex flex-col"
          >
            <div className="flex gap-0.5 text-[var(--primary)] mb-3">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} size={13} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed flex-1">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[var(--border)]">
              <div className="h-9 w-9 rounded-full bg-[var(--primary-strong)] text-white flex items-center justify-center font-display text-[12px] font-semibold tabular">
                {t.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                  {t.name}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] truncate">
                  {t.role} · {t.company}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
