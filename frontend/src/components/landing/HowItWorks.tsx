import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Upload, Cpu, FileDown, Check } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

function UploadVisual() {
  const { t } = useTranslation("landing");
  return (
    <div className="relative rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-[var(--accent)] blur-md opacity-70" />
          <div className="relative h-11 w-11 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-card flex items-center justify-center">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white"
              style={{ background: "var(--primary)" }}
            >
              <Upload size={13} strokeWidth={2.4} />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
            {t("preview.how.file")}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 tabular-nums">
            {t("preview.how.reading")}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[11px] font-semibold">
          <span className="h-1 w-1 rounded-full bg-[var(--primary)] animate-pulse" />
          {t("preview.how.live")}
        </div>
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-[var(--muted)] overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/2 rounded-full bg-[var(--primary)]"
        />
      </div>
    </div>
  );
}

function AnalyzeVisual() {
  const { t } = useTranslation("landing");
  const steps = t("preview.how.steps", { returnObjects: true }) as string[];
  const items = [
    { label: steps[0], done: true },
    { label: steps[1], done: true },
    { label: steps[2], done: false },
  ];
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="relative rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-3.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
        <div className="text-[11px] font-semibold text-[var(--foreground)]">
          {t("preview.how.analyzing")}
        </div>
        <div className="ml-auto text-[11px] font-semibold text-[var(--muted-foreground)] tabular-nums">
          8 / 12
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Predicted score ring */}
        <div className="relative h-[72px] w-[72px] shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="6" />
            <motion.circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              whileInView={{ strokeDashoffset: CIRC * (1 - 0.82) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display tabular-nums text-[20px] font-semibold text-[var(--foreground)]">
            82
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              {item.done ? (
                <div className="h-4 w-4 shrink-0 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center">
                  <Check size={9} strokeWidth={3.5} />
                </div>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--primary)] border-r-transparent"
                />
              )}
              <div
                className={`text-[11px] truncate ${
                  item.done ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)] font-medium"
                }`}
              >
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
        {t("preview.how.predicted")}
      </div>
    </div>
  );
}

function DownloadVisual() {
  const { t } = useTranslation("landing");
  return (
    <div className="relative rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-4">
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
            style={{ background: "var(--primary)" }}
          >
            PDF
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
            {t("preview.how.pdfFile")}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
            {t("preview.how.docMeta")}
          </div>
        </div>
        <button className="h-9 w-9 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center shrink-0 transition-transform hover:-translate-y-0.5">
          <FileDown size={13} />
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--accent)] text-[var(--success)] text-[11px] font-semibold tabular-nums">
          {t("preview.how.scoreChip")}
        </div>
        <div className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
          <span className="text-[var(--success)] font-semibold">{t("preview.how.points")}</span> {t("preview.how.fromV1")}
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

const STEP_MS = 5000;
const EASE = [0.16, 1, 0.3, 1] as const;

export function HowItWorks() {
  const { t } = useTranslation("landing");
  const STEPS = useSteps();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const Visual = STEPS[active].Visual;

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

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-10 items-stretch">
        {/* Steps: one open at a time, the open one runs its own timer */}
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const open = i === active;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", bounce: 0, duration: 0.6, delay: i * 0.08 }}
              >
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-expanded={open}
                className={`relative w-full text-left rounded-[22px] border p-5 transition-colors duration-300 active:scale-[0.99] ${
                  open
                    ? "bg-[var(--card)] border-[var(--border)] shadow-card"
                    : "bg-transparent border-transparent hover:bg-[var(--card)]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      open
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--accent)] text-[var(--primary-strong)]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.1} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[var(--primary-strong)] tabular-nums">
                      {t("howItWorks.stepLabel")} {s.n}
                    </div>
                    <h3 className="font-display text-[20px] font-semibold tracking-tight text-[var(--foreground)] leading-tight">
                      {s.title}
                    </h3>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 pl-[52px] text-sm sm:text-[13.5px] text-[var(--muted-foreground)] leading-relaxed">
                        {s.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timer line */}
                {open && !reduce && (
                  <div className="absolute inset-x-5 bottom-0 h-px bg-[var(--border)] overflow-hidden">
                    <motion.div
                      key={active}
                      className="h-full bg-[var(--primary)] origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                      onAnimationComplete={() => setActive((a) => (a + 1) % STEPS.length)}
                    />
                  </div>
                )}
              </button>
              </motion.div>
            );
          })}
        </div>

        {/* Stage: dark panel, same material as the hero */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.1 }}
          className="relative rounded-[32px] overflow-hidden min-h-[400px] flex flex-col p-6 sm:p-8"
          style={{
            background: "linear-gradient(180deg, #1A1D25 0%, #12141A 100%)",
            boxShadow: "0 40px 80px -30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
          aria-live="polite"
        >
          {/* Dot grid, faded toward the edges */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              maskImage: "radial-gradient(closest-side at 50% 50%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(closest-side at 50% 50%, black 40%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-40"
            style={{ background: "rgba(83,96,255,0.45)" }}
          />

          {/* Pager: segments mirror the step list */}
          <div className="relative flex items-center gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${t("howItWorks.stepLabel")} ${s.n}`}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ background: i === active ? "#6B93FF" : "rgba(255,255,255,0.14)" }}
              />
            ))}
            <span className="ml-2 text-[11px] font-semibold text-white/55 tabular-nums">
              {STEPS[active].n} / 0{STEPS.length}
            </span>
          </div>

          <div className="relative flex-1 flex items-center justify-center pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, scale: 0.98, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: EASE }}
                className="w-full max-w-[420px] sm:scale-[1.06] [&>div]:!bg-[var(--card)] [&>div]:border-white/10 [&>div]:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
              >
                <Visual />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
