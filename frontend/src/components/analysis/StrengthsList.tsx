import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// AnalysisStrength (src/types/api.ts) has {title, note}; this component reads
// `evidence` instead of `note` — pre-existing mismatch, typed as actually used.
interface StrengthItemData {
  title: string;
  evidence?: string;
}

export function StrengthsList({ strengths }: { strengths: StrengthItemData[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Strengths</CardTitle>
          <CardDescription className="mt-1">
            What's already working for you
          </CardDescription>
        </div>
        <Badge tone="success">{strengths.length}</Badge>
      </CardHeader>
      <div className="space-y-7">
        {strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="shrink-0 w-8 flex items-start justify-center pt-0.5">
              <span
                className="font-display tabular-nums text-[18px] font-semibold leading-none tracking-tight"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #B6CFC0 0%, var(--primary) 45%, var(--primary-strong) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                }}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[var(--foreground)]">{s.title}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.evidence}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
