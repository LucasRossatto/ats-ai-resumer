import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  PhoneCall,
  ShieldCheck,
  Shuffle,
  Search,
  ListChecks,
} from "lucide-react";

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
      icon: ListChecks,
      title: t("benefits.items.bullets.title"),
      desc: t("benefits.items.bullets.desc"),
    },
    {
      icon: Shuffle,
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
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        {/* Headline holds its place while the list scrolls past */}
        <div className="text-center lg:text-left lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-display text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05] tracking-tight text-[var(--foreground)] scroll-mt-28 whitespace-pre-line">
            {t("benefits.title")}
          </h2>
          <p className="text-base text-[var(--muted-foreground)] mt-5 max-w-sm mx-auto lg:mx-0 leading-relaxed">
            {t("benefits.sub")}
          </p>
        </div>

        {/* Ledger: hairlines instead of cards */}
        <ul className="border-t border-[var(--border)]">
          {BENEFITS.map((b, i) => (
            <motion.li
              key={b.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", bounce: 0, duration: 0.6, delay: i * 0.04 }}
              className="group relative border-b border-[var(--border)] py-6 sm:py-7 pl-0 transition-[padding] duration-300 ease-out hover:pl-4"
            >
              <span
                aria-hidden
                className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-[var(--primary)] origin-center scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
              />
              <div className="flex items-start gap-4">
                <b.icon
                  size={18}
                  strokeWidth={2.1}
                  className="mt-1 shrink-0 text-[var(--primary-strong)]"
                />
                <div className="max-w-xl">
                  <h3 className="font-display text-[19px] sm:text-[21px] leading-tight font-semibold tracking-tight text-[var(--foreground)]">
                    {b.title}
                  </h3>
                  <p className="text-[14px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
