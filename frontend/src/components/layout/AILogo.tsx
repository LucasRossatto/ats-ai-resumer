import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface AILogoProps {
  size?: number;
  animated?: boolean;
}

// Marca minimalista: anel de nota (86%) + currículo com uma linha em destaque.
// O brilho no vão do anel representa a IA que leva a nota até 100%.
const AILogo = ({ size = 48, animated = true }: AILogoProps) => {
  const { t } = useTranslation("common");
  const uid = useId();
  const reduce = useReducedMotion();
  const live = animated && !reduce;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={t("a11y.logo")}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6170FF" />
          <stop offset="1" stopColor="#3A43B2" />
        </linearGradient>
      </defs>

      {/* anel de nota: 86%, começando no topo */}
      <motion.circle
        cx="120"
        cy="120"
        r="98"
        fill="none"
        stroke={`url(#${uid}-g)`}
        strokeWidth="22"
        strokeLinecap="round"
        transform="rotate(-90 120 120)"
        initial={{ pathLength: live ? 0 : 0.86 }}
        animate={{ pathLength: 0.86 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      {/* brilho (IA) no vão */}
      <motion.path
        d="M77.9 17Q80 31 94 33Q80 35 77.9 49Q75.8 35 61.9 33Q75.8 31 77.9 17z"
        fill="#6170FF"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={{ scale: live ? 0 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: live ? 1 : 0 }}
      />

      {/* currículo */}
      <path
        d="M93 72H129L155 98V160a8 8 0 0 1-8 8H93a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8z"
        fill="#4A55E0"
      />
      <path d="M129 72V90a8 8 0 0 0 8 8H155z" fill="#9DB8FF" />
      <rect x="99" y="124" width="42" height="12" rx="6" fill="#fff" />
    </svg>
  );
};

export default AILogo;