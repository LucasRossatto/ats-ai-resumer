import { motion } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import AILogo from "@/components/layout/AILogo";

/**
 * Infinite horizontal marquee of "product preview" cards.
 * Renders the card list twice and slides the row from 0% to -50%
 * so the wrap-around is invisible.
 */
export function BrandCardMarquee() {
  const CARDS: ComponentType[] = [
    ResumeScoreCard,
    ScoreEvolutionCard,
    TopIssuesCard,
    RewriteCard,
    KeywordsCard,
    StrengthsCard,
  ];

  const tilts = [-2, 1.5, -1, 2, -1.5, 1];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex gap-5 py-4"
        animate={{ x: ["0%", "-400%"] }}
        transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
      >
        {[...CARDS, ...CARDS].map((Card, i) => (
          <div
            key={i}
            className="shrink-0"
            style={{ transform: `rotate(${tilts[i % tilts.length]}deg)` }}
          >
            <Card />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Reusable shell — pure white card with consistent shadow + padding
 * ───────────────────────────────────────────────────────────────────────── */
function PreviewCard({ children, width = 300 }: { children: ReactNode; width?: number }) {
  return (
    <div
      className="bg-white rounded-3xl p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
      style={{ width }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
      {children}
    </div>
  );
}

function Footer({ subtitle, version }: { subtitle?: string; version?: string }) {
  const { t } = useTranslation("auth");
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AILogo size={24} animated={false} />
        <span className="text-[11px] font-medium text-gray-700">
          {subtitle || t("marquee.brand")}
        </span>
      </div>
      {version && (
        <span className="text-[10px] text-gray-400 tabular">{version}</span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 1 — Resume score
 * ───────────────────────────────────────────────────────────────────────── */
function ResumeScoreCard() {
  const { t } = useTranslation("auth");
  return (
    <PreviewCard width={300}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <Label>{t("marquee.score.label")}</Label>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span
              className="text-[42px] font-semibold leading-none text-gray-900"
              style={{
                fontFamily: '"Geist", "Inter", sans-serif',
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              82
            </span>
            <span className="text-sm text-gray-400 font-medium">{t("marquee.score.outOf")}</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#3A43B2]">
          <TrendingUp size={10} strokeWidth={2.5} />
          {t("marquee.score.points")}
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: "82%",
            background: "linear-gradient(90deg, #5360FF 0%, #3A43B2 100%)",
          }}
        />
      </div>

      <Footer version={t("marquee.score.version")} />
    </PreviewCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 2 — Score Evolution mini chart
 * ───────────────────────────────────────────────────────────────────────── */
function ScoreEvolutionCard() {
  const { t } = useTranslation("auth");
  // points along a 240×60 viewBox
  const points = "0,48 60,36 120,24 180,12 240,4";
  const area = "0,60 0,48 60,36 120,24 180,12 240,4 240,60";

  return (
    <PreviewCard width={300}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Label>{t("marquee.evolution.label")}</Label>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span
              className="text-[28px] font-semibold leading-none text-gray-900"
              style={{
                fontFamily: '"Geist", "Inter", sans-serif',
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              +24
            </span>
            <span className="text-xs text-gray-400">{t("marquee.evolution.overall")}</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#3A43B2]">
          V1 → V3
        </div>
      </div>

      <svg
        viewBox="0 0 240 60"
        className="w-full h-[60px]"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5360FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5360FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#ev-fill)" />
        <polyline
          points={points}
          stroke="#3A43B2"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {[
          [0, 48],
          [60, 36],
          [120, 24],
          [180, 12],
          [240, 4],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.5"
            fill="white"
            stroke="#3A43B2"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 tabular">
        <span>58</span>
        <span>66</span>
        <span>72</span>
        <span>78</span>
        <span className="text-gray-900 font-semibold">82</span>
      </div>

      <Footer subtitle={t("marquee.evolution.footer")} />
    </PreviewCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 3 — Top Issues
 * ───────────────────────────────────────────────────────────────────────── */
function TopIssuesCard() {
  const { t } = useTranslation("auth");
  const titles = t("marquee.issues.items", { returnObjects: true }) as string[];
  const issues = [
    { title: titles[0], sev: "high" },
    { title: titles[1], sev: "medium" },
    { title: titles[2], sev: "high" },
  ];
  const TONE: Record<string, string> = {
    high: "bg-[#F8E3E0] text-[#B5564E]",
    medium: "bg-[#FBF1E2] text-[#C28A3A]",
    low: "bg-gray-100 text-gray-500",
  };

  return (
    <PreviewCard width={320}>
      <div className="flex items-start justify-between mb-4">
        <Label>{t("marquee.issues.label")}</Label>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F8E3E0] text-[#B5564E]">
          {t("marquee.issues.found")}
        </div>
      </div>

      <div className="space-y-2.5">
        {issues.map((iss, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
              <AlertCircle size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900 truncate">
                {iss.title}
              </div>
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${TONE[iss.sev]}`}
            >
              {t(`marquee.issues.sev.${iss.sev}`)}
            </span>
          </div>
        ))}
      </div>

      <Footer subtitle={t("marquee.issues.footer")} />
    </PreviewCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 4 — Bullet Rewrite
 * ───────────────────────────────────────────────────────────────────────── */
function RewriteCard() {
  const { t } = useTranslation("auth");
  return (
    <PreviewCard width={340}>
      <div className="flex items-start justify-between mb-3">
        <Label>{t("marquee.rewrite.label")}</Label>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#3A43B2]">
          <Sparkles size={10} strokeWidth={2.5} />
          {t("marquee.rewrite.suggested")}
        </div>
      </div>

      <div className="space-y-2">
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
          <div className="text-[9px] uppercase tracking-wide text-gray-400 mb-1 font-semibold">
            {t("marquee.rewrite.original")}
          </div>
          <div className="text-[12.5px] text-gray-500 leading-snug line-through decoration-gray-300">
            {t("marquee.rewrite.originalText")}
          </div>
        </div>

        <div className="flex justify-center text-gray-300">
          <ArrowRight size={14} />
        </div>

        <div className="rounded-2xl bg-[#EFF4FF] p-3">
          <div className="text-[9px] uppercase tracking-wide text-[#3A43B2] mb-1 font-semibold">
            {t("marquee.rewrite.rewritten")}
          </div>
          <div className="text-[12.5px] text-gray-900 leading-snug">
            {t("marquee.rewrite.rewrittenText")}
          </div>
        </div>
      </div>

      <Footer subtitle={t("marquee.rewrite.footer")} />
    </PreviewCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 5 — Keywords
 * ───────────────────────────────────────────────────────────────────────── */
function KeywordsCard() {
  const { t } = useTranslation("auth");
  const present = ["React", "TypeScript", "Node.js", "GraphQL", "AWS"];
  const missing = ["Kubernetes", "gRPC"];

  return (
    <PreviewCard width={320}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Label>{t("marquee.keywords.label")}</Label>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span
              className="text-[28px] font-semibold leading-none text-gray-900"
              style={{
                fontFamily: '"Geist", "Inter", sans-serif',
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              24
            </span>
            <span className="text-sm text-gray-400">{t("marquee.keywords.matched")}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {present.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EFF4FF] text-[#3A43B2]"
            >
              <Check size={9} strokeWidth={3} />
              {k}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {missing.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F8E3E0] text-[#B5564E]"
            >
              <X size={9} strokeWidth={3} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <Footer subtitle={t("marquee.keywords.footer")} />
    </PreviewCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Card 6 — Standout Strengths
 * ───────────────────────────────────────────────────────────────────────── */
function StrengthsCard() {
  const { t } = useTranslation("auth");
  const strengths = (
    t("marquee.strengths.items", { returnObjects: true }) as string[]
  ).map((title) => ({ title }));
  return (
    <PreviewCard width={310}>
      <div className="flex items-start justify-between mb-4">
        <Label>{t("marquee.strengths.label")}</Label>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#3A43B2]">
          {t("marquee.strengths.total")}
        </div>
      </div>

      <div className="space-y-2.5">
        {strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#EFF4FF] flex items-center justify-center text-[#3A43B2] shrink-0">
              <Sparkles size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900">
                {s.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Footer subtitle={t("marquee.strengths.footer")} />
    </PreviewCard>
  );
}
