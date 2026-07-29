import { useTranslation } from "react-i18next";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

// NOTE: this expects a { keywords, formatting, impact, clarity } shape, but
// Analysis.scoreBreakdown (src/types/api.ts) is actually a ScoreBreakdownItem[]
// (mock data uses [{label, value}, ...]) — pre-existing mismatch, not introduced
// by the TS migration. Typed to match what this component actually reads today.
interface ScoreBreakdownData {
  keywords?: number;
  formatting?: number;
  impact?: number;
  clarity?: number;
}

export function ScoreBreakdown({ breakdown }: { breakdown?: ScoreBreakdownData }) {
  const { t } = useTranslation("analysis");
  if (!breakdown) return null;
  const data = [
    { axis: t("scoreBreakdown.keywords"), v: breakdown.keywords, full: 25 },
    { axis: t("scoreBreakdown.formatting"), v: breakdown.formatting, full: 25 },
    { axis: t("scoreBreakdown.impact"), v: breakdown.impact, full: 25 },
    { axis: t("scoreBreakdown.clarity"), v: breakdown.clarity, full: 25 },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("scoreBreakdown.title")}</CardTitle>
          <CardDescription className="mt-1">{t("scoreBreakdown.desc")}</CardDescription>
        </div>
      </CardHeader>
      <div className="h-[230px] -mx-2">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis domain={[0, 25]} tick={false} axisLine={false} />
            <Radar
              dataKey="v"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
        {data.map((d) => (
          <div key={d.axis} className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
              {d.axis}
            </div>
            <div className="font-display tabular text-lg font-semibold mt-0.5">
              {d.v}
              <span className="text-xs text-[var(--muted-foreground)] font-normal ml-0.5">
                /25
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
