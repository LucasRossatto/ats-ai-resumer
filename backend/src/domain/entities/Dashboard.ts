export interface DashboardTotals {
  resumes: number;
  rewrites: number;
  analyses: number;
  exports: number;
}

export interface DashboardResumeRef {
  id: string;
  title: string;
  latestVersionNumber: number;
  currentVersionId?: string | null;
  updatedAt?: Date;
}

export interface ScorePoint {
  versionId: string;
  label: string;
  score: number;
  createdAt?: Date;
}

export interface VersionStackItem {
  id: string;
  label: string;
  title: string;
  score: number;
  delta: number;
}

export interface SparkPoint {
  value: number;
}

/**
 * A headline number with its movement since the previous reading and the short
 * history the card draws as a sparkline. `value` is null while the user has no
 * data to derive it from, `delta` while there is no previous reading.
 */
export interface KpiMetric {
  value: number | null;
  delta: number | null;
  spark: SparkPoint[];
}

export interface DashboardKpi {
  atsScore: KpiMetric;
  versions: KpiMetric;
  keywords: KpiMetric;
  issues: KpiMetric;
}

export type ActivityType = 'upload' | 'rewrite' | 'analysis';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  label: string;
  resumeId: string;
  createdAt?: Date;
}

export interface DashboardOverview {
  totals: DashboardTotals;
  latestResume: DashboardResumeRef | null;
  scoreSeries: ScorePoint[];
  versionStack: VersionStackItem[];
  kpi: DashboardKpi;
  activity: ActivityEvent[];
}
