import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gauge, GitBranch, Wand2, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import AILogo from "@/components/layout/AILogo";

const STEP_MS = 1900;
const LOGO_MS = 2000;

// Cada etapa ocupa a tela inteira com uma cor sólida, um ícone e uma frase curta.
// A primeira (logo) aparece só na abertura e não volta no loop.
const STEPS: { key: string; bg: string; fg: string; Icon?: LucideIcon }[] = [
  { key: "logo", bg: "#FFFFFF", fg: "#0F172A" }, // --background / --foreground (tema claro)
  // Hex espelhando os tokens do index.css (framer-motion não interpola `var()`):
  // --accent-hero, --brand-amber(+foreground) e --accent-hero-2.
  { key: "improve", bg: "#5360FF", fg: "#FFFFFF", Icon: Wand2 },
  { key: "ats", bg: "#FFB020", fg: "#3A2500", Icon: Gauge },
  { key: "versions", bg: "#C71F7F", fg: "#FFFFFF", Icon: GitBranch },
];

/** Loading de tela cheia que troca de etapa (cor, ícone e frase) em loop. */
export function AppLoader() {
  const { t } = useTranslation("common");
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(
      () => setI((n) => (n + 1 < STEPS.length ? n + 1 : 1)),
      i === 0 ? LOGO_MS : STEP_MS
    );
    return () => clearTimeout(id);
  }, [reduce, i]);

  const { key, bg, fg, Icon } = STEPS[i];
  const label = Icon ? t(`loader.${key}`) : t("status.loading");

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center"
      initial={false}
      animate={{ backgroundColor: bg, color: fg }}
      transition={{ duration: reduce ? 0 : 0.45, ease: "easeInOut" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={reduce ? false : { scale: 0, rotate: -25, opacity: 0 }}
          animate={
            reduce
              ? undefined
              : { scale: 1, rotate: [0, -8, 8, -4, 0], opacity: 1 }
          }
          exit={reduce ? undefined : { scale: 0, opacity: 0 }}
          transition={{
            scale: { type: "spring", stiffness: 380, damping: 16 },
            opacity: { duration: 0.15 },
            rotate: { duration: 0.7, delay: 0.25 },
          }}
        >
          {Icon ? <Icon size={44} strokeWidth={2.2} aria-hidden="true" /> : <AILogo size={96} />}
        </motion.div>
      </AnimatePresence>

      {/* a frase sobe de dentro de uma máscara */}
      <div className="overflow-hidden h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={key}
            className="text-xl font-semibold leading-8"
            initial={reduce ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: "-100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
