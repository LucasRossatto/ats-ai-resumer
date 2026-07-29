import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  PhoneCall,
  ShieldCheck,
  Zap,
  Search,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

function useBenefits() {
  const { t } = useTranslation("landing");
  return [
    {
      icon: PhoneCall,
      title: t("benefits.items.callbacks.title"),
      desc: t("benefits.items.callbacks.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("benefits.items.parsed.title"),
      desc: t("benefits.items.parsed.desc"),
    },
    {
      icon: Sparkles,
      title: t("benefits.items.bullets.title"),
      desc: t("benefits.items.bullets.desc"),
    },
    {
      icon: Zap,
      title: t("benefits.items.apply.title"),
      desc: t("benefits.items.apply.desc"),
    },
    {
      icon: Search,
      title: t("benefits.items.keywords.title"),
      desc: t("benefits.items.keywords.desc"),
    },
  ];
}

export function BenefitsSection() {
  const { t } = useTranslation("landing");
  const BENEFITS = useBenefits();
  return (
    <section
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        title={<>{t("benefits.title")}</>}
        sub={t("benefits.sub")}
      />

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
        {BENEFITS.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className={`rounded-[22px] bg-[var(--card)] border border-[var(--border)] shadow-card hover:shadow-hover transition-all p-5 sm:p-6 ${
              i === 0 ? "lg:col-span-3" : i === 1 ? "lg:col-span-3" : "lg:col-span-2"
            }`}
          >
            <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center mb-4">
              <b.icon size={16} strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-[var(--foreground)]">
              {b.title}
            </h3>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
              {b.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
