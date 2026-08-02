/**
 * Exports are deliberately absent: the PDF is generated client side and never
 * reaches the server, so any count here would be a hardcoded zero pretending to
 * be data. The field comes back when the feature does.
 */
export interface DashboardTotals {
  resumes: number;
  rewrites: number;
  analyses: number;
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

/**
 * The keywords card reads as a ratio ("42 of 60 covered"), so it carries the
 * denominator the other three have no use for. Null while no analysis has run,
 * for the same reason `value` is.
 */
export interface KeywordsKpiMetric extends KpiMetric {
  total: number | null;
}

export interface DashboardKpi {
  atsScore: KpiMetric;
  versions: KpiMetric;
  keywordsMatched: KeywordsKpiMetric;
  issuesIdentified: KpiMetric;
}

export type ActivityType = 'upload' | 'rewrite' | 'analyze';

/**
 * One entry of the activity feed. Same convention as `HistoryEvent`: `at` is the
 * instant an event landed on a timeline, `createdAt` stays reserved for the
 * creation stamp of a stored record. The two coexist on purpose.
 */
export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  label: string;
  resumeId: string;
  at?: Date;
}

export interface DashboardOverview {
  totals: DashboardTotals;
  latestResume: DashboardResumeRef | null;
  scoreSeries: ScorePoint[];
  versionStack: VersionStackItem[];
  kpi: DashboardKpi;
  activity: ActivityEvent[];
}
