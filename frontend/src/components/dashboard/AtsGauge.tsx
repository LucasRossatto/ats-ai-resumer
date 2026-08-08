import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const RADIUS = 130;
const ARC_LENGTH = Math.PI * RADIUS; // length of a half circle

type Tone = "success" | "warning" | "danger" | "neutral";

function statusFor(score: number, t: TFunction): { label: string; tone: Tone } {
  if (score >= 85) return { label: t("tiers.excellent"), tone: "success" };
  if (score >= 70) return { label: t("tiers.strong"), tone: "success" };
  if (score >= 55) return { label: t("tiers.fair"), tone: "warning" };
  if (score > 0) return { label: t("tiers.needsWork"), tone: "danger" };
  return { label: t("tiers.noScore"), tone: "neutral" };
}

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function AtsGauge({ score = 0, delta = 0 }: { score?: number; delta?: number }) {
  const { t } = useTranslation("dashboard");
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const pct = safeScore / 100;
  const dashLength = ARC_LENGTH * pct;
  const status = statusFor(safeScore, t);
  const animated = useCountUp(safeScore);

  const DeltaIcon =
    delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-wrap gap-y-2">
        <div className="flex-1 min-w-40">
          <CardTitle className="text-base">{t("atsGauge.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("atsGauge.desc")}
          </CardDescription>
        </div>
        <Badge tone={status.tone} className="shrink-0 whitespace-nowrap">
          {status.label}
        </Badge>
      </CardHeader>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
        <div className="relative w-full max-w-[360px]">
          <svg
            viewBox="0 0 300 170"
            className="w-full h-auto block"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="atsGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--primary-strong)" />
              </linearGradient>
            </defs>

            {/* Track */}
            <path
              d={`M 20 155 A ${RADIUS} ${RADIUS} 0 0 1 280 155`}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Value arc */}
            <motion.path
              d={`M 20 155 A ${RADIUS} ${RADIUS} 0 0 1 280 155`}
              fill="none"
              stroke="url(#atsGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={ARC_LENGTH}
              initial={{ strokeDashoffset: ARC_LENGTH }}
              animate={{ strokeDashoffset: ARC_LENGTH - dashLength }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          {/* Score sitting inside the bowl */}
          <div className="absolute inset-x-0 top-[46%] flex flex-col items-center pointer-events-none">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)] font-semibold">
              {t("atsGauge.score")}
            </div>
            <div className="font-display tabular text-[60px] font-semibold tracking-tight text-[var(--foreground)] leading-none mt-1.5">
              {animated}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
              {t("atsGauge.outOf100")}
            </div>
          </div>
        </div>

        {/* Delta pill — below the gauge */}
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular",
            delta > 0 && "bg-[var(--accent)] text-[var(--success)]",
            delta < 0 && "bg-[#F8E3E0] text-[var(--destructive)]",
            delta === 0 && "bg-[var(--muted)] text-[var(--muted-foreground)]"
          )}
        >
          <DeltaIcon size={11} strokeWidth={2.5} />
          {delta > 0 ? "+" : ""}
          {delta} {t("atsGauge.vsLastAnalysis")}
        </div>
      </div>
    </Card>
  );
}
