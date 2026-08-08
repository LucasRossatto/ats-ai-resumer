import { HistoryEvent } from '@domain/entities/History';

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

export interface DashboardOverview {
  totals: DashboardTotals;
  latestResume: DashboardResumeRef | null;
  scoreSeries: ScorePoint[];
  versionStack: VersionStackItem[];
  kpi: DashboardKpi;
  /**
   * The same events the history page lists, capped to a short excerpt. Reusing
   * `HistoryEvent` rather than declaring a parallel shape is deliberate: the two
   * feeds show the same thing, and while they were separate types they drifted
   * apart in two fields without anything failing.
   */
  activity: HistoryEvent[];
}
