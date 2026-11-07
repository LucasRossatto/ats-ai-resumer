import { useTranslation } from "react-i18next";
import { Gauge, Layers, Lightbulb, KeyRound } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ScoreEvolutionChart } from "@/components/dashboard/ScoreEvolutionChart";
import { AtsGauge } from "@/components/dashboard/AtsGauge";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { VersionStack } from "@/components/dashboard/VersionStack";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import type { HistoryEvent } from "@/types/api";
import { SectionHeader } from "./FeaturesSection";

// Static sample data rendered by the real dashboard components, so the preview can't drift from the app.
const spark = (values: number[]) => values.map((value) => ({ value }));

const SCORE_SERIES = [
  { label: "V1", score: 38 },
  { label: "V2", score: 91 },
];

const VERSIONS = [
  { id: "v1", label: "V1", score: 38, title: "Upload" },
  { id: "v2", label: "V2", score: 91, title: "Rewrite" },
];

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const ACTIVITY: HistoryEvent[] = [
  { id: "a1", type: "analyze", title: "", subtitle: "", label: "91", resumeId: "r1", resumeTitle: "Frontend Developer", at: ago(2 * 60 * 60 * 1000) },
  { id: "a2", type: "rewrite", title: "", subtitle: "", label: "V2", resumeId: "r1", resumeTitle: "Frontend Developer", at: ago(5 * 60 * 60 * 1000) },
  { id: "a3", type: "analyze", title: "", subtitle: "", label: "38", resumeId: "r1", resumeTitle: "Frontend Developer", at: ago(DAY) },
  { id: "a4", type: "upload", title: "", subtitle: "", label: "V1", resumeId: "r1", resumeTitle: "Frontend Developer", at: ago(3 * DAY) },
];

const USER = {
  id: "demo",
  name: "Ana Souza",
  email: "ana@email.com",
  roles: [],
  createdAt: ago(120 * DAY),
};

export function DashboardPreviewSection() {
  const { t } = useTranslation("landing");
  const { t: td } = useTranslation("dashboard");

  const stats = [
    { label: td("page.statResumes"), value: 1 },
    { label: td("page.statRewrites"), value: 14 },
    { label: td("page.statAnalyses"), value: 3 },
  ];

  return (
    <section
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        id="dashboard-preview"
        title={<>{t("dashboardPreview.title")}</>}
        sub={t("dashboardPreview.sub")}
      />

      {/* inert: the real components carry navigation buttons, this is only a preview */}
      <div
        inert
        className="mt-12 rounded-[32px] border border-[var(--border)] bg-[var(--background)] p-4 sm:p-6 lg:p-8 space-y-5 select-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label={td("page.statAtsScore")}
            value={91}
            suffix={td("page.of100")}
            delta={53}
            chart="bars"
            data={spark([38, 91])}
            icon={Gauge}
          />
          <StatCard
            label={td("page.statVersions")}
            value={2}
            chart="line"
            data={spark([1, 2])}
            icon={Layers}
          />
          <StatCard
            label={t("preview.dash.kpiFixed")}
            value={14}
            delta={9}
            chart="line"
            data={spark([2, 4, 6, 9, 11, 13, 14])}
            icon={Lightbulb}
          />
          <StatCard
            label={td("page.statKeywords")}
            value={25}
            suffix="/ 26"
            delta={16}
            chart="line"
            data={spark([9, 12, 15, 19, 22, 24, 25])}
            icon={KeyRound}
            accent
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6">
            <ScoreEvolutionChart data={SCORE_SERIES} currentScore={91} delta={53} />
          </div>
          <div className="lg:col-span-3">
            <AtsGauge score={91} delta={53} />
          </div>
          <div className="lg:col-span-3">
            <ProfileCard user={USER} stats={stats} hidePlan />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <VersionStack versions={VERSIONS} resumeTitle="Frontend Developer" />
          </div>
          <div className="lg:col-span-5">
            <ActivityFeed items={ACTIVITY} />
          </div>
        </div>
      </div>
    </section>
  );
}
