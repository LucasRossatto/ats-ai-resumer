import { useState } from "react";
import { GitCompare, ArrowRight, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useDiff } from "@/hooks/useResumes";

interface DiffVersion {
  _id: string;
  label: string;
}

// resumesApi.diff (src/types/api.ts DiffResponse) actually returns { hunks },
// not { stats, parts } — pre-existing mismatch, not introduced by the TS
// migration. Typed here to match what this component actually reads.
interface DiffStats {
  added: number;
  removed: number;
}
interface DiffPart {
  added?: boolean;
  removed?: boolean;
  value: string;
}
interface DiffViewData {
  stats: DiffStats;
  parts: DiffPart[];
}

function GradientNumber({
  value,
  size = 32,
  palette = "sage",
}: {
  value: string | number;
  size?: number;
  palette?: "sage" | "danger";
}) {
  const gradient =
    palette === "danger"
      ? "linear-gradient(135deg, #F2B7B1 0%, var(--destructive) 50%, #7A3A36 100%)"
      : "linear-gradient(135deg, #B6CFC0 0%, var(--primary) 45%, var(--primary-strong) 100%)";
  return (
    <span
      className="font-display tabular-nums font-semibold leading-none tracking-tight"
      style={{
        fontSize: size,
        backgroundImage: gradient,
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

function VersionPicker({
  versions,
  value,
  onChange,
  exclude,
}: {
  versions: DiffVersion[];
  value?: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-[var(--card)] border border-[var(--border)] p-0.5 rounded-full shadow-card">
      {versions.map((v) => {
        const active = value === v._id;
        const disabled = v._id === exclude;
        return (
          <button
            key={v._id}
            onClick={() => onChange(v._id)}
            disabled={disabled}
            className={cn(
              "h-7 px-3 text-[11px] font-semibold rounded-full transition-all tabular-nums",
              active
                ? "text-white shadow-card"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              disabled && "opacity-30 cursor-not-allowed"
            )}
            style={
              active
                ? {
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
                  }
                : undefined
            }
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: string;
  onChange: (mode: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-[var(--muted)] border border-[var(--border)] p-0.5 rounded-full">
      {["words", "lines"].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "h-7 px-3 text-[11px] font-semibold capitalize rounded-full transition-colors",
            mode === m
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export function DiffView({
  resumeId,
  versions,
}: {
  resumeId: string;
  versions: DiffVersion[];
}) {
  const [mode, setMode] = useState("words");
  const initial =
    versions.length >= 2
      ? {
          from: versions[versions.length - 2]._id,
          to: versions[versions.length - 1]._id,
        }
      : { from: versions[0]?._id, to: versions[0]?._id };

  const [fromId, setFromId] = useState(initial.from);
  const [toId, setToId] = useState(initial.to);

  const { data, isLoading, error } = useDiff(resumeId, fromId ?? "", toId ?? "", mode);
  const diffData = data as unknown as DiffViewData | undefined;

  if (versions.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Need two versions to compare"
        description="Apply rewrites or upload a new version to see diffs here."
      />
    );
  }

  const fromLabel = versions.find((v) => v._id === fromId)?.label || "—";
  const toLabel = versions.find((v) => v._id === toId)?.label || "—";
  const net = diffData ? diffData.stats.added - diffData.stats.removed : 0;

  return (
    <Card>
      <CardHeader className="!mb-3">
        <div>
          <CardTitle className="text-base">Version Diff</CardTitle>
          <CardDescription className="mt-1">
            Compare what changed between any two versions
          </CardDescription>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </CardHeader>

      {/* Compare bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-3 mb-5 flex items-center justify-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
          From
        </span>
        <VersionPicker
          versions={versions}
          value={fromId}
          onChange={setFromId}
          exclude={toId}
        />
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-card"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
          }}
        >
          <ArrowRight size={13} strokeWidth={2.5} />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
          To
        </span>
        <VersionPicker
          versions={versions}
          value={toId}
          onChange={setToId}
          exclude={fromId}
        />
      </div>

      {isLoading && <Skeleton className="h-[300px] rounded-2xl" />}

      {error && (
        <div className="text-xs text-[var(--destructive)] bg-[#F8E3E0] rounded-xl px-3 py-2">
          {error.message}
        </div>
      )}

      {diffData && (
        <>
          {/* Hero stats */}
          <div
            className="relative rounded-2xl border border-[var(--border)] p-5 mb-5 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--accent) 0%, var(--muted) 70%, var(--card) 100%)",
            }}
          >
            <svg
              className="absolute -top-6 -right-6 pointer-events-none opacity-50"
              width="140"
              height="140"
              viewBox="0 0 140 140"
              aria-hidden
            >
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.3"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
            </svg>

            <div className="relative flex items-end gap-8 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                  Added
                </div>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <GradientNumber value={`+${diffData.stats.added}`} size={40} />
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    chars
                  </span>
                </div>
              </div>
              <div className="h-10 w-px bg-[var(--border)]" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                  Removed
                </div>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <GradientNumber
                    value={`−${diffData.stats.removed}`}
                    size={40}
                    palette="danger"
                  />
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    chars
                  </span>
                </div>
              </div>
              <div className="h-10 w-px bg-[var(--border)]" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                  Net change
                </div>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span
                    className={cn(
                      "font-display tabular-nums text-[26px] font-semibold leading-none tracking-tight",
                      net > 0
                        ? "text-[var(--primary-strong)]"
                        : net < 0
                        ? "text-[var(--destructive)]"
                        : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {net > 0 ? "+" : net < 0 ? "" : "±"}
                    {net}
                  </span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    chars
                  </span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                  Comparing
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--foreground)] tabular-nums">
                  {fromLabel}
                  <ArrowRight
                    size={11}
                    className="text-[var(--primary-strong)]"
                  />
                  {toLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Diff display */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--muted)]/60">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                <FileText size={11} />
                Inline diff · {mode}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)] border border-[var(--primary)]/30" />
                  Added
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#F8E3E0] border border-[var(--destructive)]/30" />
                  Removed
                </span>
              </div>
            </div>
            <div className="p-5 max-h-[600px] overflow-auto font-mono text-[13px] leading-[1.75] whitespace-pre-wrap text-[var(--muted-foreground)]">
              {diffData.parts.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    !p.added && !p.removed && "text-[var(--foreground)]",
                    p.added &&
                      "bg-[var(--accent)] text-[var(--primary-strong)] font-medium rounded px-0.5 py-0.5",
                    p.removed &&
                      "bg-[#F8E3E0] text-[var(--destructive)] line-through decoration-[var(--destructive)]/50 rounded px-0.5 py-0.5"
                  )}
                >
                  {p.value}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
