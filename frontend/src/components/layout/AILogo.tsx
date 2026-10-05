import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface AILogoProps {
  size?: number;
  animated?: boolean;
}

// Mark: a résumé sheet (folded corner) being scanned by a light beam, with an
// open amber padlock on the fold. Reads as "document + scan + unlocked" at any size.
const AILogo = ({ size = 48, animated = true }: AILogoProps) => {
  const { t } = useTranslation("common");
  const uid = useId();
  const reduce = useReducedMotion();
  const live = animated && !reduce;

  const sheet = "M14 9h13l8 8v22a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={t("a11y.logo")}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#5360FF" />
          <stop offset="1" stopColor="#3A43B2" />
        </linearGradient>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94B5FF" stopOpacity="0" />
          <stop offset="1" stopColor="#94B5FF" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={sheet} />
        </clipPath>
      </defs>

      <rect width="48" height="48" rx="14" fill={`url(#${uid}-bg)`} />

      {/* sheet */}
      <path d={sheet} fill="#fff" />
      <path d="M27 9v6a2 2 0 0 0 2 2h6z" fill="#C7D2FF" />

      {/* text lines */}
      <g fill="#3A43B2" opacity="0.85">
        <rect x="18" y="21" width="10" height="2.4" rx="1.2" />
        <rect x="18" y="26" width="14" height="2.4" rx="1.2" opacity="0.5" />
        <rect x="18" y="31" width="8" height="2.4" rx="1.2" opacity="0.5" />
      </g>

      {/* scan beam, clipped to the sheet */}
      <g clipPath={`url(#${uid}-clip)`}>
        <motion.g
          initial={{ y: 22 }}
          animate={live ? { y: [4, 32, 4] } : { y: 22 }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="12" y="-8" width="24" height="8" fill={`url(#${uid}-beam)`} />
          <rect x="12" y="-0.75" width="24" height="1.5" fill="#5360FF" />
        </motion.g>
      </g>

      {/* open padlock on the fold: the shackle lifts once the scan ends */}
      <rect x="33.5" y="9.5" width="9" height="6.5" rx="1.6" fill="#FFB020" />
      <motion.path
        d="M36 9.5V7.6a2.5 2.5 0 0 1 4.9-.6"
        stroke="#FFB020"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        animate={live ? { y: [0, 0, -0.8, 0, 0] } : undefined}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
};

export default AILogo;
