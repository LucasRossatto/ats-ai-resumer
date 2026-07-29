import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Upload, Cpu, FileDown, ArrowRight, Check, Sparkles } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

function UploadVisual() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[var(--muted)]/60 to-[var(--card)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-[var(--accent)] blur-md opacity-70" />
          <div className="relative h-11 w-11 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-card flex items-center justify-center">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
              }}
            >
              <Upload size={13} strokeWidth={2.4} />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
            resume_v3.pdf
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 tabular-nums">
            412 KB · parsing…
          </div>
        </div>
        <div className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[9px] font-semibold">
          <span className="h-1 w-1 rounded-full bg-[var(--primary)] animate-pulse" />
          live
        </div>
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-[var(--muted)] overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

function AnalyzeVisual() {
  const items = [
    { label: "Structure parsed", done: true },
    { label: "ATS rules checked", done: true },
    { label: "Generating rewrites…", done: false },
  ];
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[var(--muted)]/60 to-[var(--card)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="h-4 w-4 rounded-full border-2 border-[var(--primary)] border-r-transparent"
        />
        <div className="text-[11px] font-semibold text-[var(--foreground)]">
          Analyzing
        </div>
        <div className="ml-auto inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] text-[9px] font-semibold tabular-nums">
          8 / 12
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-2"
          >
            <div
              className={`h-4 w-4 rounded-full flex items-center justify-center ${
                item.done
                  ? "bg-[var(--accent)] text-[var(--primary-strong)]"
                  : "border border-[var(--primary)]/40"
              }`}
            >
              {item.done && <Check size={9} strokeWidth={3.5} />}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="text-[10px] text-[var(--muted-foreground)]">
          Predicted score
        </div>
        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary-strong)] tabular-nums">
          <Sparkles size={10} strokeWidth={2.5} />
          82 / 100
        </div>
      </div>
    </div>
  );
}

function DownloadVisual() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[var(--muted)]/60 to-[var(--card)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-12 w-9 rounded-md bg-[var(--card)] border border-[var(--border)] shadow-card flex flex-col gap-[2px] p-1.5">
            <div className="h-[2px] w-3/4 rounded bg-[var(--muted-foreground)]/40" />
            <div className="h-[2px] w-full rounded bg-[var(--muted-foreground)]/25" />
            <div className="h-[2px] w-5/6 rounded bg-[var(--muted-foreground)]/25" />
            <div className="h-[2px] w-2/3 rounded bg-[var(--muted-foreground)]/25" />
            <div className="mt-auto h-[5px] w-full rounded-[1px] bg-[var(--accent)]" />
          </div>
          <div
            className="absolute -bottom-1.5 -right-1.5 h-5 px-1.5 rounded-md text-white text-[8px] font-bold flex items-center"
            style={{
              background:
                "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
            }}
          >
            PDF
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
            resume_v3_optimized.pdf
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            ATS-ready · 1 page
          </div>
        </div>
        <button className="h-9 w-9 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center shrink-0 transition-transform hover:-translate-y-0.5">
          <FileDown size={13} />
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--accent)] text-[var(--success)] text-[10px] font-semibold tabular-nums">
          ATS 86
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
          <span className="text-[var(--success)] font-semibold">+24 pts</span> from V1
        </div>
      </div>
    </div>
  );
}

function useSteps() {
  const { t } = useTranslation("landing");
  return [
    {
      n: "01",
      icon: Upload,
      title: t("howItWorks.steps.upload.title"),
      desc: t("howItWorks.steps.upload.desc"),
      Visual: UploadVisual,
    },
    {
      n: "02",
      icon: Cpu,
      title: t("howItWorks.steps.analyze.title"),
      desc: t("howItWorks.steps.analyze.desc"),
      Visual: AnalyzeVisual,
    },
    {
      n: "03",
      icon: FileDown,
      title: t("howItWorks.steps.download.title"),
      desc: t("howItWorks.steps.download.desc"),
      Visual: DownloadVisual,
    },
  ];
}

export function HowItWorks() {
  const { t } = useTranslation("landing");
  const STEPS = useSteps();
  return (
    <section
      className="relative px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        id="how-it-works"
        title={<>{t("howItWorks.titlePre")}&nbsp;{t("howItWorks.titlePost")}</>}
        sub={t("howItWorks.sub")}
      />

      <div className="mt-16 relative grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Flowing dashed sage line behind the cards on desktop */}
        <svg
          className="hidden lg:block absolute top-[100px] left-0 right-0 w-full pointer-events-none -z-0"
          height="40"
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <motion.path
            d="M 80 20 C 280 -20 420 60 600 20 S 920 -20 1120 20"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.35"
            strokeWidth="1.25"
            strokeDasharray="4 6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const Visual = s.Visual;
          return (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.65,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative"
            >
              {/* Card */}
              <div
                className="relative rounded-[28px] bg-[var(--card)] border border-[var(--border)] shadow-card hover:shadow-hover transition-all duration-300 hover:-translate-y-1 p-7 overflow-hidden"
                style={{ minHeight: 420 }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 inset-x-7 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, var(--primary) 50%, transparent)",
                    opacity: 0.5,
                  }}
                />

                {/* Massive ghost number */}
                <div
                  className="absolute -top-2 right-3 font-display text-[140px] font-bold leading-none tracking-tighter select-none pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, var(--accent) 0%, transparent 75%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                  }}
                  aria-hidden
                >
                  {s.n}
                </div>

                {/* Step pill */}
                <div className="relative inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[10px] font-semibold uppercase tracking-wider">
                  {t("howItWorks.stepLabel")} {s.n}
                </div>

                {/* Icon with soft glow */}
                <div className="relative mt-6 inline-block">
                  <div className="absolute -inset-2 rounded-3xl bg-[var(--accent)] blur-lg opacity-70" />
                  <div
                    className="relative h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-card"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
                    }}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="relative font-display text-[22px] font-semibold tracking-tight text-[var(--foreground)] mt-6 leading-tight">
                  {s.title}
                </h3>

                {/* Description */}
                <p className="relative text-[13.5px] text-[var(--muted-foreground)] mt-2.5 leading-relaxed">
                  {s.desc}
                </p>

                {/* Visual mockup */}
                <div className="relative mt-7">
                  <Visual />
                </div>
              </div>

              {/* Arrow between cards on desktop */}
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
                  className="hidden lg:flex absolute top-[112px] -right-[14px] z-10 h-7 w-7 rounded-full items-center justify-center text-white shadow-card"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
                  }}
                  aria-hidden
                >
                  <ArrowRight size={12} strokeWidth={2.5} />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
