import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { AnalysisIssue } from "@/types/api";

// The mock analysis payload never sets `explanation` — component renders it
// as an optional extra in case a future backend response includes it.
interface IssueItemData extends AnalysisIssue {
  explanation?: string;
}

const SEV_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

function IssueItem({ issue }: { issue: IssueItemData }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] p-4 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-[var(--card)] flex items-center justify-center shrink-0 text-[var(--muted-foreground)]">
          <AlertCircle size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-sm text-[var(--foreground)]">{issue.title}</div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={SEV_TONE[issue.severity] || "neutral"}>
                {issue.severity}
              </Badge>
              <ChevronDown
                size={14}
                className={cn(
                  "text-[var(--muted-foreground)] transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="text-xs text-[var(--muted-foreground)] mt-2">
                  {issue.explanation}
                </div>
                {issue.fix && (
                  <div className="mt-2 text-xs rounded-xl bg-[var(--accent)] text-[var(--primary-strong)] px-3 py-2">
                    <strong className="font-semibold">Fix:</strong> {issue.fix}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}

export function IssuesList({ issues }: { issues: IssueItemData[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Top Issues</CardTitle>
          <CardDescription className="mt-1">
            What to fix first, ranked by impact
          </CardDescription>
        </div>
        <Badge tone="neutral">{issues.length}</Badge>
      </CardHeader>
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <IssueItem key={i} issue={issue} />
        ))}
      </div>
    </Card>
  );
}
