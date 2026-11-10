import { ResponsiveContainer, LineChart, Line, BarChart, Bar } from "recharts";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { SparkPoint } from "@/types/api";

function MiniLine({ data, color }: { data: SparkPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={42}>
      <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniBars({ data, color }: { data: SparkPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={42}>
      <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} barSize={6} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatCardProps {
  label: string;
  value?: number | string | null;
  suffix?: string;
  delta?: number | null;
  chart?: "line" | "bars";
  data?: SparkPoint[];
  icon?: LucideIcon;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  suffix,
  delta,
  chart = "line",
  data = [],
  icon: Icon,
  accent = false,
}: StatCardProps) {
  const positive = delta == null ? null : delta >= 0;
  const color = accent ? "#FFFFFF" : "var(--primary)";
  const ChartCmp = chart === "bars" ? MiniBars : MiniLine;
  const displayValue = value == null || value === "" ? "-" : value;
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card
      variant={accent ? "accent" : "default"}
      className={cn(
        "relative overflow-hidden",
        accent && "text-white"
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
              accent
                ? "bg-white/15 text-white"
                : "bg-[var(--accent)] text-[var(--primary-strong)]"
            )}
          >
            <Icon size={15} />
          </div>
        )}
        <span
          className={cn(
            "text-sm sm:text-[13px] leading-tight font-medium",
            accent ? "text-white" : "text-[var(--muted-foreground)]"
          )}
        >
          {label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-display tabular text-3xl font-semibold tracking-tight">
              {displayValue}
            </span>
            {suffix && (
              <span
                className={cn(
                  "text-base sm:text-sm font-medium",
                  accent ? "text-white" : "text-[var(--muted-foreground)]"
                )}
              >
                {suffix}
              </span>
            )}
          </div>
          {delta != null && (
            <Badge
              tone={accent ? "ink" : positive ? "success" : "danger"}
              className={cn(accent && "bg-white/15 text-white")}
            >
              {positive ? "+" : ""}
              {delta}%
            </Badge>
          )}
        </div>

        {hasData && (
          <div className="w-[96px] shrink-0 opacity-90">
            <ChartCmp data={data} color={color} />
          </div>
        )}
      </div>
    </Card>
  );
}
