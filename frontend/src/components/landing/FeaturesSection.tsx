import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Gauge,
  PenLine,
  KeyRound,
  Layers,
  GitCompare,
  LineChart,
  FileDown,
} from "lucide-react";

function useFeatures() {
  const { t } = useTranslation("landing");
  return [
    {
      icon: Gauge,
      title: t("features.items.atsScore.title"),
      desc: t("features.items.atsScore.desc"),
      preview: <ScoreBarsPreview />,
      span: "lg:col-span-2",
    },
    {
      icon: PenLine,
      title: t("features.items.aiRewrite.title"),
      desc: t("features.items.aiRewrite.desc"),
      preview: <RewritePreview />,
    },
    {
      icon: KeyRound,
      title: t("features.items.keywordOpt.title"),
      desc: t("features.items.keywordOpt.desc"),
      preview: <KeywordsPreview />,
    },
    {
      icon: Layers,
      title: t("features.items.versionHistory.title"),
      desc: t("features.items.versionHistory.desc"),
      preview: <VersionsPreview />,
    },
    {
      icon: GitCompare,
      title: t("features.items.diffComparison.title"),
      desc: t("features.items.diffComparison.desc"),
      preview: <DiffPreview />,
    },
    {
      icon: LineChart,
      title: t("features.items.analyticsDashboard.title"),
      desc: t("features.items.analyticsDashboard.desc"),
      preview: <ChartPreview />,
      span: "lg:col-span-2",
    },
    {
      icon: FileDown,
      title: t("features.items.pdfExport.title"),
      desc: t("features.items.pdfExport.desc"),
      preview: <PdfPreview />,
    },
  ];
}

export function FeaturesSection() {
  const { t } = useTranslation("landing");
  const FEATURES = useFeatures();
  return (
    <section
      className="relative px-3 sm:px-6 mt-18 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        id="features"
        title={
          <>
            {t("features.titlePre")}
            <br className="hidden sm:block" /> {t("features.titleGetYou")}{" "}
            <span style={{ color: "#5360FF" }}>
              {t("features.titleHighlight")}
            </span>
          </>
        }
        sub={t("features.sub")}
      />

      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.985 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", bounce: 0, duration: 0.6, delay: (i % 3) * 0.06 }}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className={`group relative flex flex-col rounded-[26px] bg-[var(--card)] border border-[var(--border)] shadow-card hover:shadow-hover transition-shadow duration-300 overflow-hidden p-2 ${f.span || ""}`}
          >
            {/* Spotlight follows the pointer */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--primary) 14%, transparent), transparent 70%)",
              }}
            />

            {/* Preview leads: the product is the headline */}
            <div className="relative flex-1 transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
              {f.preview}
            </div>

            <div className="relative flex items-start gap-3 px-3.5 pt-4 pb-3.5">
              <f.icon
                size={16}
                strokeWidth={2.25}
                className="mt-[3px] shrink-0 text-[var(--primary-strong)]"
              />
              <div>
                <h3 className="font-display text-[17px] leading-tight font-semibold tracking-tight text-[var(--foreground)]">
                  {f.title}
                </h3>
                <p className="text-[13px] text-[var(--muted-foreground)] mt-1 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SectionHeader({ id = undefined, title, sub, center = true }) {
  return (
    <div className={center ? "text-center max-w-3xl mx-auto" : "max-w-3xl"}>
      <h2
        id={id}
        className="font-display text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05] tracking-tight text-[var(--foreground)] scroll-mt-28"
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[15px] sm:text-base text-[var(--muted-foreground)] mt-4 leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );
}

/* ---------------- mini previews ---------------- */

function ScoreBarsPreview() {
  const { t } = useTranslation("landing");
  const labels = t("preview.feat.barLabels", { returnObjects: true }) as string[];
  const bars = [88, 74, 91, 82].map((value, i) => ({ label: labels[i], value }));
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[12px] text-[var(--muted-foreground)] font-semibold">
            {t("preview.feat.breakdown")}
          </div>
          <div className="font-display tabular text-[26px] font-semibold tracking-tight">
            86<span className="text-sm text-[var(--muted-foreground)]">/100</span>
          </div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-[11px] text-[var(--success)] bg-[var(--accent)] px-2 py-0.5 rounded-full font-semibold tabular">
          +18 pts
        </div>
      </div>
      <div className="space-y-2.5">
        {bars.map((b, i) => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px] text-[var(--muted-foreground)] mb-1">
              <span>{b.label}</span>
              <span className="tabular text-[var(--foreground)] font-semibold">
                {b.value}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${b.value}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.9,
                  delay: 0.1 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="h-full rounded-full bg-[var(--primary)]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewritePreview() {
  const { t } = useTranslation("landing");
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4 space-y-2">
      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3">
        <div className="text-[12px] text-[var(--muted-foreground)] font-semibold mb-1">
          {t("preview.feat.before")}
        </div>
        <div className="text-[12px] text-[var(--muted-foreground)] leading-snug line-through">
          {t("preview.feat.beforeText")}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--accent)] p-3">
        <div className="text-[12px] text-[var(--primary-strong)] font-semibold mb-1">
          {t("preview.feat.after")}
        </div>
        <div className="text-[12px] text-[var(--foreground)] leading-snug">
          {t("preview.feat.afterText")}
        </div>
      </div>
    </div>
  );
}

function KeywordsPreview() {
  const { t } = useTranslation("landing");
  const matched = ["React", "TypeScript", "Node.js"];
  const missing = ["GraphQL", "Docker"];
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
      <div className="text-[12px] text-[var(--muted-foreground)] font-semibold mb-2">
        {t("preview.feat.job")}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {matched.map((k) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[11px] font-semibold"
          >
            ✓ {k}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((k) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded-full bg-[var(--destructive)]/15 text-[var(--destructive)] text-[11px] font-semibold"
          >
            + {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function VersionsPreview() {
  const versions = [
    { label: "V1", score: 62 },
    { label: "V2", score: 78 },
    { label: "V3", score: 86 },
  ];
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4 flex items-center gap-2">
      {versions.map((v, i) => (
        <div
          key={v.label}
          className={`flex-1 rounded-xl p-2.5 ${
            i === versions.length - 1
              ? "bg-[var(--accent)] border border-[var(--primary)]/30"
              : "bg-[var(--card)] border border-[var(--border)]"
          }`}
        >
          <div className="text-[12px] text-[var(--muted-foreground)] font-semibold">
            {v.label}
          </div>
          <div className="font-display tabular text-[20px] font-semibold tracking-tight mt-0.5">
            {v.score}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffPreview() {
  const { t } = useTranslation("landing");
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-3 space-y-1 font-mono text-[11px]">
      <div className="flex gap-2 px-2 py-1 rounded-md bg-[var(--destructive)]/10">
        <span className="text-[var(--destructive)] font-bold w-3">−</span>
        <span className="text-[var(--muted-foreground)] line-through">
          {t("preview.feat.diffOld")}
        </span>
      </div>
      <div className="flex gap-2 px-2 py-1 rounded-md bg-[var(--accent)]/60">
        <span className="text-[var(--success)] font-bold w-3">+</span>
        <span className="text-[var(--foreground)]">{t("preview.feat.diffNew1")}</span>
      </div>
      <div className="flex gap-2 px-2 py-1 rounded-md bg-[var(--accent)]/60">
        <span className="text-[var(--success)] font-bold w-3">+</span>
        <span className="text-[var(--foreground)]">{t("preview.feat.diffNew2")}</span>
      </div>
    </div>
  );
}

function ChartPreview() {
  const { t } = useTranslation("landing");
  const pts = [42, 58, 51, 67, 74, 81, 86];
  const max = 100;
  const w = 320;
  const h = 90;
  const stepX = w / (pts.length - 1);
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / max) * h}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
      <div className="flex items-end justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[12px] text-[var(--muted-foreground)] font-semibold">
            {t("preview.feat.chart")}
          </div>
          <div className="font-display tabular text-[26px] font-semibold tracking-tight">
            86
          </div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-[11px] text-[var(--success)] bg-[var(--accent)] px-2 py-0.5 rounded-full font-semibold tabular">
          {t("preview.feat.chartDelta")}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[90px] overflow-visible">
        <path d={area} fill="var(--primary)" fillOpacity="0.15" />
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function PdfPreview() {
  return (
    <div className="rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4 flex items-center justify-center">
      <div className="w-[120px] h-[140px] rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-card p-2 space-y-1.5 rotate-[-3deg]">
        <div className="h-1.5 w-12 rounded-full bg-[var(--foreground)]" />
        <div className="h-1 w-16 rounded-full bg-[var(--border)]" />
        <div className="pt-1 space-y-1">
          {[10, 14, 12, 16, 11].map((w, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full bg-[var(--border)]"
              style={{ width: `${w * 5}px` }}
            />
          ))}
        </div>
        <div className="pt-1.5 h-1 w-10 rounded-full bg-[var(--primary)]" />
        <div className="space-y-1">
          {[15, 11, 13].map((w, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full bg-[var(--border)]"
              style={{ width: `${w * 5}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
