import type { PointerEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowDown } from "lucide-react";

const R = 24;
const CIRC = 2 * Math.PI * R;
const SCORE = 95;
const EASE = [0.16, 1, 0.3, 1] as const;
const TILT = 10; // max degrees
// Critically damped, response ~0.4s: the sheet follows the pointer without overshoot.
const SPRING = { bounce: 0, duration: 0.4 } as const;

const bar = (w: string, dark = false) => (
  <div
    className="h-[7px] rounded-full"
    style={{ width: w, background: dark ? "#C9CEDA" : "#E3E6EE" }}
  />
);

// A light resume sheet that tilts toward the pointer, with the rewrite highlighted in place
// and the score ring lifted off the paper on its own depth layer.
export function HeroDashboardPreview() {
  const { t } = useTranslation("landing");
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-TILT, TILT]), SPRING);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [TILT, -TILT]), SPRING);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative w-full h-[460px] sm:h-[540px] flex items-center justify-center"
      style={{ perspective: 1200 }}
    >
      <div
        aria-hidden
        className="absolute h-[60%] w-[60%] rounded-full blur-3xl opacity-40"
        style={{ background: "rgba(83,96,255,0.45)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          className="relative w-[300px] sm:w-[360px] aspect-[3/4] rounded-[18px] p-6 sm:p-7"
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F3F5F9 100%)",
            boxShadow:
              "0 50px 90px -24px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.6) inset",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#DDE1EB]" />
            <div className="space-y-2">
              {bar("120px", true)}
              {bar("72px")}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-[#7B8396] tabular">{t("preview.hero.file")}</div>

          <div className="mt-5 space-y-2.5">
            {bar("94%")}
            {bar("80%")}
            {bar("88%")}
          </div>

          {/* The rewrite, in place */}
          <div className="mt-6 rounded-xl bg-[#EEF2FF] p-3.5">
            <div className="text-[11px] leading-snug text-[#8A92A6] line-through decoration-[#B4BBCC]">
              {t("preview.hero.beforeText")}
            </div>
            <ArrowDown size={12} className="my-1.5 text-[#5360FF]" />
            <motion.div
              initial={{ backgroundSize: "0% 100%" }}
              animate={{ backgroundSize: "100% 100%" }}
              transition={{ duration: 1.6, ease: EASE, delay: 0.9 }}
              className="text-[12px] leading-[1.55] font-medium text-[#12141A] rounded-[3px]"
              style={{
                backgroundImage: "linear-gradient(rgba(107,147,255,0.28), rgba(107,147,255,0.28))",
                backgroundRepeat: "no-repeat",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
              }}
            >
              {t("preview.hero.afterText")}
            </motion.div>
          </div>

          <div className="mt-5 space-y-2.5">
            {bar("90%")}
            {bar("62%")}
          </div>

          {/* Score ring, lifted off the paper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.7 }}
            className="absolute -top-5 -right-5 sm:-right-8 flex items-center gap-3 pl-2.5 pr-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl mt-4 2xl:mt-0"
            style={{
              transform: "translateZ(70px)",
              background: "rgba(18,20,26,0.88)",
              boxShadow: "0 28px 50px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="relative h-12 2xl:h-14 w-12 2xl:w-14">
              <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
                <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <motion.circle
                  cx="28"
                  cy="28"
                  r={R}
                  fill="none"
                  stroke="#6B93FF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: CIRC * (1 - SCORE / 100) }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.9 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display tabular text-[18px] font-semibold text-white">
                {SCORE}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/55">{t("preview.hero.score")}</div>
              <div className="text-[13px] font-semibold text-[#94B5FF]">{t("preview.hero.strong")}</div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
