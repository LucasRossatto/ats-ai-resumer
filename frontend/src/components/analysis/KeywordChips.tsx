import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

function Chip({ children, tone }: { children: ReactNode; tone: "present" | "missing" }) {
  if (tone === "present") {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 pl-1.5 pr-3 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] text-[12px] font-semibold transition-transform hover:-translate-y-px">
        <span className="h-4 w-4 rounded-full bg-[var(--primary-strong)] text-white flex items-center justify-center">
          <Check size={9} strokeWidth={3.5} />
        </span>
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-7 pl-1.5 pr-3 rounded-full bg-[#F8E3E0]/70 text-[var(--destructive)] text-[12px] font-semibold transition-transform hover:-translate-y-px">
      <span className="h-4 w-4 rounded-full bg-[var(--destructive)] text-white flex items-center justify-center">
        <X size={9} strokeWidth={3.5} />
      </span>
      {children}
    </span>
  );
}

function SectionHeader({
  tone,
  label,
  count,
}: {
  tone: "present" | "missing";
  label: string;
  count: number;
}) {
  const isPresent = tone === "present";
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span
        className={
          isPresent
            ? "h-6 w-6 rounded-lg bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center"
            : "h-6 w-6 rounded-lg bg-[#F8E3E0] text-[var(--destructive)] flex items-center justify-center"
        }
      >
        {isPresent ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      </span>
      <div className="text-[12px] font-semibold text-[var(--foreground)]">{label}</div>
      <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
        {count}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}

export function KeywordChips({
  present = [],
  missing = [],
}: {
  present?: string[];
  missing?: string[];
}) {
  const total = present.length + missing.length;
  const pct = total ? Math.round((present.length / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Keywords</CardTitle>
          <CardDescription className="mt-1">
            What ATS sees vs what it expects
          </CardDescription>
        </div>
      </CardHeader>

      {/* Match-rate hero */}
      <div
        className="relative rounded-2xl border border-[var(--border)] p-5 mb-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--accent) 0%, var(--muted) 70%, var(--card) 100%)",
        }}
      >
        {/* Decorative dashed sage arc, top right */}
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
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        </svg>

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
              Match rate
            </div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span
                className="font-display tabular-nums text-[44px] font-semibold leading-none tracking-tight"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #B6CFC0 0%, var(--primary) 45%, var(--primary-strong) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {present.length}
              </span>
              <span className="text-[var(--muted-foreground)] text-base font-medium tabular-nums">
                / {total}
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)] ml-1">
                keywords
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-display tabular-nums text-[26px] font-semibold leading-none tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              {pct}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mt-1">
              coverage
            </div>
          </div>
        </div>

        <div className="relative mt-4 h-1.5 w-full rounded-full bg-[var(--card)]/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--primary) 0%, var(--primary-strong) 100%)",
            }}
          />
        </div>
      </div>

      {/* Present */}
      <div className="space-y-5">
        <div>
          <SectionHeader tone="present" label="Present" count={present.length} />
          {present.length ? (
            <div className="flex flex-wrap gap-1.5">
              {present.map((k) => (
                <Chip key={k} tone="present">
                  {k}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)] pl-8">None detected.</p>
          )}
        </div>

        <div>
          <SectionHeader tone="missing" label="Missing" count={missing.length} />
          {missing.length ? (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((k) => (
                <Chip key={k} tone="missing">
                  {k}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)] pl-8">
              You&apos;re hitting the major keywords. Nice.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
