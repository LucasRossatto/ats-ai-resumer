import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface TooltipPayloadItem {
  value: number | string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-hover px-3 py-2 text-xs">
      <div className="text-[var(--muted-foreground)]">{label}</div>
      <div className="font-display tabular text-base font-semibold mt-0.5">
        {payload[0].value}
      </div>
    </div>
  );
}

interface ScoreEvolutionChartProps {
  data: { label: string; score: number }[];
  currentScore: number;
  delta: number;
}

export function ScoreEvolutionChart({ data, currentScore, delta }: ScoreEvolutionChartProps) {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("scoreEvolution.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("scoreEvolution.desc")}
          </CardDescription>
        </div>
        <Badge tone="success" className="gap-1" title={tCommon("badge.success")}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> {t("scoreEvolution.onTrack")}
        </Badge>
      </CardHeader>

      <div className="flex items-end justify-between gap-6 mb-4">
        <div>
          <div className="text-xs text-[var(--muted-foreground)]">{t("scoreEvolution.current")}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display tabular text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              {currentScore}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">{t("page.of100")}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--muted-foreground)]">{t("scoreEvolution.changeVsV1")}</div>
          <Badge tone={delta >= 0 ? "success" : "danger"} className="mt-1">
            {delta >= 0 ? "+" : ""}
            {delta} pts
          </Badge>
        </div>
      </div>

      <div className="h-[180px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#scoreFill)"
              dot={{ r: 4, stroke: "var(--primary)", fill: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
