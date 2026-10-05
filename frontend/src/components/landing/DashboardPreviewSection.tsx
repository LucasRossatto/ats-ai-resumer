import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  PenLine,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Gauge,
  GitCompare,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DarkPanel } from "./DarkPanel";
import { SectionHeader } from "./FeaturesSection";

const SERIES = [42, 51, 58, 67, 74, 81, 86];
const BREAKDOWN_VALUES = [88, 74, 91, 82, 79];

export function DashboardPreviewSection() {
  const { t } = useTranslation("landing");
  const breakdownLabels = t("preview.dash.breakdownLabels", { returnObjects: true }) as string[];
  const issueList = t("preview.dash.issueList", { returnObjects: true }) as string[];
  const strengthList = t("preview.dash.strengthList", { returnObjects: true }) as string[];
  return (
    <section
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        id="dashboard-preview"
        title={<>{t("dashboardPreview.title")}</>}
        sub={t("dashboardPreview.sub")}
      />

      <DarkPanel className="mt-12 p-4 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* KPI row */}
          <KpiCard
            className="lg:col-span-3"
            icon={Gauge}
            label={t("preview.dash.kpiScore")}
            value="86"
            suffix="/100"
            delta="+18%"
          />
          <KpiCard
            className="lg:col-span-3"
            icon={GitCompare}
            label={t("preview.dash.kpiVersions")}
            value="4"
            delta="+2"
          />
          <KpiCard
            className="lg:col-span-3"
            icon={AlertCircle}
            label={t("preview.dash.kpiFixed")}
            value="11"
            delta="+7"
          />
          <KpiCard
            className="lg:col-span-3"
            icon={KeyRound}
            label={t("preview.dash.kpiKeywords")}
            value="24"
            suffix="/26"
            delta="+9"
            accent
          />

          {/* Score evolution */}
          <DarkCard className="lg:col-span-7">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/55 font-semibold">
                  {t("preview.dash.evolution")}
                </div>
                <div className="font-display text-base font-semibold text-white mt-1">
                  {t("preview.dash.evolutionSub")}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(107,147,255,0.16)] text-[#94B5FF] text-[11px] font-semibold tabular">
                <TrendingUp size={10} strokeWidth={2.5} />
                +44 pts
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <div className="font-display tabular text-[44px] font-semibold tracking-tight text-white leading-none">
                86
              </div>
              <div className="text-[12px] text-white/50">/ 100</div>
            </div>

            <AreaChart />
          </DarkCard>

          {/* Score breakdown */}
          <DarkCard className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-wide text-white/55 font-semibold">
              {t("preview.dash.breakdown")}
            </div>
            <div className="font-display text-base font-semibold text-white mt-1 mb-4">
              {t("preview.dash.breakdownSub")}
            </div>
            {BREAKDOWN_VALUES.map((value, i) => ({
              label: breakdownLabels[i],
              value,
            })).map((b, i) => (
              <div key={b.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[11px] text-white/55 mb-1">
                  <span>{b.label}</span>
                  <span className="tabular text-white font-semibold">{b.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${b.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-[#6B93FF]"
                  />
                </div>
              </div>
            ))}
          </DarkCard>

          {/* Bullet rewrite */}
          <DarkCard className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/55 font-semibold">
                  {t("preview.dash.rewrite")}
                </div>
                <div className="font-display text-base font-semibold text-white mt-1">
                  {t("preview.dash.applyAll")}
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(107,147,255,0.14)] text-[#94B5FF] text-[11px] font-semibold">
                <PenLine size={10} /> {t("preview.dash.aiTag")}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_24px_1fr] gap-3 items-center">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/55 font-semibold mb-1">
                  {t("preview.dash.original")}
                </div>
                <div className="text-[12.5px] text-white/70 leading-snug">
                  {t("preview.dash.originalText")}
                </div>
              </div>
              <div className="flex justify-center text-white/30">
                <ArrowRight size={16} />
              </div>
              <div className="rounded-xl bg-[rgba(107,147,255,0.10)] border border-[rgba(107,147,255,0.22)] p-3">
                <div className="text-[11px] uppercase tracking-wide text-[#94B5FF] font-semibold mb-1">
                  {t("preview.dash.rewritten")}
                </div>
                <div className="text-[12.5px] text-white leading-snug">
                  {t("preview.dash.rewrittenText")}
                </div>
              </div>
            </div>
          </DarkCard>

          {/* Issues + strengths */}
          <DarkCard className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[#D4847C] mb-2">
                  <AlertCircle size={12} />
                  <span className="text-[11px] uppercase tracking-wide font-semibold">
                    {t("preview.dash.issues")}
                  </span>
                </div>
                {issueList.map((s) => (
                  <div
                    key={s}
                    className="text-[11.5px] text-white/65 py-1 border-b border-white/[0.04] last:border-0"
                  >
                    {s}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[#6B93FF] mb-2">
                  <CheckCircle2 size={12} />
                  <span className="text-[11px] uppercase tracking-wide font-semibold">
                    {t("preview.dash.strengths")}
                  </span>
                </div>
                {strengthList.map(
                  (s) => (
                    <div
                      key={s}
                      className="text-[11.5px] text-white/65 py-1 border-b border-white/[0.04] last:border-0"
                    >
                      {s}
                    </div>
                  )
                )}
              </div>
            </div>
          </DarkCard>
        </div>
      </DarkPanel>
    </section>
  );
}

function DarkCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}

interface KpiCardProps {
  className?: string;
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  delta?: string;
  accent?: boolean;
}

function KpiCard({ className = "", icon: Icon, label, value, suffix, delta, accent }: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        accent
          ? "bg-[#2C3494] border-[rgba(107,147,255,0.3)]"
          : "bg-white/[0.03] border-white/[0.07]"
      } ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center ${
            accent
              ? "bg-white/15 text-white"
              : "bg-[rgba(107,147,255,0.14)] text-[#94B5FF]"
          }`}
        >
          <Icon size={13} />
        </div>
        <span className="text-[11px] text-white/55">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display tabular text-3xl font-semibold tracking-tight text-white">
          {value}
        </span>
        {suffix && <span className="text-[12px] text-white/55">{suffix}</span>}
      </div>
      {delta && (
        <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-[rgba(107,147,255,0.14)] text-[#6B93FF] text-[11px] font-semibold tabular">
          {delta}
        </div>
      )}
    </div>
  );
}

function AreaChart() {
  const w = 600;
  const h = 140;
  const stepX = w / (SERIES.length - 1);
  const path = SERIES.map(
    (p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / 100) * h}`
  ).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]">
      <motion.path
        d={area}
        fill="#6B93FF"
        fillOpacity="0.15"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="#94B5FF"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      {SERIES.map((p, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={h - (p / 100) * h}
          r="3.5"
          fill="#16181D"
          stroke="#94B5FF"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
