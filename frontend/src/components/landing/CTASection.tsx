import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

interface FaqItem {
  q: string;
  a: string;
}

export function CTASection() {
  const { t } = useTranslation("landing");
  const items = t("faq.items", { returnObjects: true }) as FaqItem[];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader id="faq-title" title={t("faq.title")} sub={t("faq.sub")} />

      <div className="mt-10 flex flex-col gap-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="rounded-2xl bg-card border border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="cursor-pointer w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-display text-[15px] sm:text-base font-semibold text-foreground">
                  {item.q}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted-foreground transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/register"
          className="group inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold text-[14px] text-white bg-[#5360FF] shadow-[0_10px_30px_-8px_rgba(107,147,255,0.5)] hover:bg-[#4750E0] active:scale-[0.98] transition-all"
        >
          {t("faq.cta")}
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
