import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2, Sparkles, Wand2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BulletRewrite } from "@/types/api";

function GradientNumber({ value, size = 32 }: { value: string | number; size?: number }) {
  return (
    <span
      className="font-display tabular-nums font-semibold leading-none tracking-tight"
      style={{
        fontSize: size,
        backgroundImage:
          "linear-gradient(135deg, #B6CFC0 0%, var(--primary) 45%, var(--primary-strong) 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }}
    >
      {value}
    </span>
  );
}

interface BulletRewritesProps {
  rewrites?: BulletRewrite[];
  /**
   * Applies the whole analysis. There is no per-bullet selection because the
   * backend rewrites every bullet of the analysis in one go.
   */
  onApply?: () => void;
  isApplying?: boolean;
  error?: string;
}

export function BulletRewrites({ rewrites, onApply, isApplying, error }: BulletRewritesProps) {
  const { t } = useTranslation("analysis");

  if (!rewrites?.length) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">{t("rewrites.title")}</CardTitle>
            <CardDescription className="mt-1">{t("rewrites.noRewrites")}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="!mb-3">
        <div>
          <CardTitle className="text-base">{t("rewrites.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("rewrites.desc")}
          </CardDescription>
        </div>
      </CardHeader>

      {/* Hero summary */}
      <div
        className="relative rounded-2xl border border-[var(--border)] p-5 mb-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--accent) 0%, var(--muted) 70%, var(--card) 100%)",
        }}
      >
        {/* Decorative sage rings */}
        <svg
          className="absolute -top-8 -right-8 pointer-events-none opacity-50"
          width="160"
          height="160"
          viewBox="0 0 160 160"
          aria-hidden
        >
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
          <circle
            cx="80"
            cy="80"
            r="48"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.18"
            strokeWidth="1"
          />
        </svg>

        <div className="relative flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
              {t("rewrites.aiRewrites")}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <GradientNumber value={rewrites.length} size={44} />
              <span className="text-[11px] text-[var(--muted-foreground)] ml-1">
                {t("rewrites.ready")}
              </span>
            </div>
          </div>

          <div
            className="rounded-full p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, #B6CFC0 0%, var(--primary) 45%, var(--primary-strong) 100%)",
            }}
          >
            <Button
              variant="accent"
              size="sm"
              onClick={() => onApply?.()}
              disabled={isApplying}
              className="!rounded-full"
            >
              {isApplying ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Wand2 size={13} />
              )}
              {t("rewrites.applyAll")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rewrites.map((r, i) => {
          return (
            <div
              key={r.id || `idx-${i}`}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:bg-[var(--muted)]/60"
            >
              {/* Header row: number + section */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 flex items-center justify-center">
                    <GradientNumber
                      value={String(i + 1).padStart(2, "0")}
                      size={22}
                    />
                  </div>
                  {r.section && (
                    <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[11px] font-semibold capitalize">
                      {r.section}
                    </span>
                  )}
                </div>
              </div>

              {/* Before / arrow / After */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_36px_1fr] gap-3 items-stretch">
                <div className="relative rounded-xl bg-[var(--muted)]/70 p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]/50" />
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                      {t("rewrites.original")}
                    </div>
                  </div>
                  <div className="text-[13.5px] text-[var(--muted-foreground)] leading-relaxed line-through decoration-[var(--muted-foreground)]/30">
                    {r.original}
                  </div>
                </div>

                <div className="flex items-center justify-center py-2 md:py-0">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white shadow-card"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
                    }}
                  >
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </div>
                </div>

                <div
                  className="relative rounded-xl p-4 border"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent) 0%, var(--card) 100%)",
                    borderColor:
                      "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles
                      size={10}
                      strokeWidth={2.5}
                      className="text-[var(--primary-strong)]"
                    />
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--primary-strong)]">
                      {t("rewrites.rewritten")}
                    </div>
                  </div>
                  <div className="text-[13.5px] text-[var(--foreground)] leading-relaxed font-medium">
                    {r.rewritten}
                  </div>
                </div>
              </div>

              {/* Rationale */}
              {r.rationale && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--muted)]/60 border border-[var(--border)] px-3 py-2.5">
                  <span className="h-5 w-5 rounded-md bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={10} strokeWidth={2.5} />
                  </span>
                  <div className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                    <span className="font-semibold text-[var(--foreground)]">
                      {t("rewrites.whyWorks")}{" "}
                    </span>
                    {r.rationale}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 text-xs text-[var(--destructive)] bg-[#F8E3E0] rounded-xl px-3 py-2">
          {error}
        </div>
      )}
    </Card>
  );
}
