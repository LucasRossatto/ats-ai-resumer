import type { ID, ISODateString } from "./common";

// ── Auth ────────────────────────────────────────────────────────────────────

export type Role = "user" | "admin";

/**
 * Matches `CurrentUser` on the backend, the one shape `/auth/me`, login,
 * register and the profile update all answer with.
 */
export interface User {
  id: ID;
  /** Lives on the profile, null in the window before the saga creates it. */
  name: string | null;
  email: string;
  roles: Role[];
  createdAt?: ISODateString;
}

export interface AuthResponse {
  user: User;
}

/** What login and register answer with, before the tokens are stored away. */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface OkResponse {
  ok: boolean;
}

// ── Resume content (parsed sections) ───────────────────────────────────────
// Mirrors `ParsedSections` on the backend. Every field is optional on purpose:
// the sections come out of an LLM parse of the PDF, and any of them can be
// missing for a resume that simply does not have that section.

export interface ResumeLink {
  label?: string;
  url?: string;
}

export interface ResumeBasics {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: ResumeLink[];
}

export interface ResumeExperience {
  role?: string;
  company?: string;
  location?: string;
  period?: string;
  bullets?: string[];
}

export interface ResumeEducation {
  degree?: string;
  school?: string;
  location?: string;
  period?: string;
  details?: string;
}

export interface ResumeProject {
  name?: string;
  description?: string;
  tech?: string[];
  links?: ResumeLink[];
}

export interface ResumeCertification {
  name?: string;
  issuer?: string;
  year?: string;
}

export interface ParsedSections {
  basics?: ResumeBasics;
  summary?: string;
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  projects?: ResumeProject[];
  skills?: string[];
  certifications?: ResumeCertification[];
  languages?: string[];
  interests?: string[];
}

// ── Resume + version ────────────────────────────────────────────────────────

export type VersionSourceType = "upload" | "rewrite";

export interface ResumeVersion {
  id: ID;
  resumeId: ID;
  versionNumber: number;
  label: string;
  sourceType: VersionSourceType;
  rawText?: string;
  parsedSections?: ParsedSections;
  parentVersionId?: ID | null;
  latestAnalysisId?: ID | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/**
 * A version as the detail route returns it: the stored record plus the score of
 * its latest analysis, joined at read time. Null when the version was never
 * analyzed, never zero.
 */
export interface ResumeVersionDetail extends ResumeVersion {
  score: number | null;
}

export interface Resume {
  id: ID;
  title: string;
  currentVersionId?: ID | null;
  /**
   * Doubles as the version count while no version can be deleted: numbering is
   * dense, so the latest number is how many there are.
   */
  latestVersionNumber: number;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/**
 * Shape returned by `resumesApi.list`: the card fields plus the best score the
 * resume ever reached. Null when it was never analyzed.
 */
export interface ResumeListItem extends Resume {
  bestScore: number | null;
}

// ── Analysis ────────────────────────────────────────────────────────────────

export type IssueSeverity = "low" | "medium" | "high";

/** The four axes the radar chart draws, each out of 25. */
export interface ScoreBreakdown {
  keywords?: number;
  formatting?: number;
  impact?: number;
  clarity?: number;
}

export interface AnalysisIssue {
  title: string;
  severity?: IssueSeverity;
  explanation?: string;
  fix?: string;
}

export interface AnalysisStrength {
  title: string;
  evidence?: string;
}

export interface BulletRewrite {
  id?: ID;
  section?: string;
  original: string;
  rewritten: string;
  rationale?: string;
}

export interface Analysis {
  id: ID;
  resumeId: ID;
  versionId: ID;
  atsScore: number;
  model: string;
  summary?: string;
  scoreBreakdown?: ScoreBreakdown;
  issues?: AnalysisIssue[];
  strengths?: AnalysisStrength[];
  keywordsPresent?: string[];
  keywordsMissing?: string[];
  bulletRewrites?: BulletRewrite[];
  createdAt?: ISODateString;
}

/** Granularity the backend accepts on `GET /resumes/:id/diff`. */
export type DiffMode = "words" | "chars" | "lines" | "sentences";

export interface DiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

/** Character counts, as `DiffService.summarize` computes them. */
export interface DiffStats {
  added: number;
  removed: number;
}

export interface DiffVersionRef {
  id: ID;
  label: string;
  versionNumber: number;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardTotals {
  resumes: number;
  rewrites: number;
  analyses: number;
}

/** Null while the user has no resume yet. */
export interface DashboardResumeRef {
  id: ID;
  title: string;
  latestVersionNumber: number;
  currentVersionId?: ID | null;
  updatedAt?: ISODateString;
}

export interface ScoreSeriesPoint {
  versionId: ID;
  label: string;
  score: number;
  createdAt?: ISODateString;
}

export interface VersionStackItem {
  id: ID;
  label: string;
  title: string;
  score: number;
  /** Move since the previous version. `VersionStack` derives its own, this is the backend's. */
  delta: number;
}

export interface SparkPoint {
  value: number;
}

/**
 * A headline number with its movement since the previous reading. `value` is
 * null while the user has no data to derive it from, `delta` while there is no
 * previous reading to compare against.
 */
export interface KpiMetric {
  value: number | null;
  delta: number | null;
  spark: SparkPoint[];
}

/** The keywords card reads as a ratio, so it carries the denominator too. */
export interface KpiKeywordsMatched extends KpiMetric {
  total: number | null;
}

export interface DashboardKpi {
  atsScore: KpiMetric;
  versions: KpiMetric;
  issuesIdentified: KpiMetric;
  keywordsMatched: KpiKeywordsMatched;
}

export interface Dashboard {
  totals: DashboardTotals;
  latestResume: DashboardResumeRef | null;
  scoreSeries: ScoreSeriesPoint[];
  versionStack: VersionStackItem[];
  kpi: DashboardKpi;
  /** The same events the history page lists, capped to a short excerpt. */
  activity: HistoryEvent[];
}

// ── Analytics: Insights ─────────────────────────────────────────────────────

export interface InsightResumeRef {
  id: ID;
  title: string;
  latestVersionNumber: number;
}

export interface InsightsBestScore {
  value: number;
  resumeId: ID;
  resumeTitle: string;
  createdAt?: ISODateString;
}

export interface ScoreTrendPoint {
  score: number;
  resumeId: ID;
  resumeTitle: string;
  at?: ISODateString;
}

export interface TopIssue {
  title: string;
  severity: IssueSeverity;
  count: number;
}

export interface TopKeyword {
  keyword: string;
  count: number;
}

export interface ResumePerformance {
  resumeId: ID;
  title: string;
  latestScore: number;
  bestScore: number;
  improvement: number;
  analysesCount: number;
}

/**
 * `empty` is true while no analysis ever ran, and tells the page to draw the
 * onboarding panel over `resumes` instead of the charts. The shape does not
 * change with it: the lists come back empty and the scores null.
 */
export interface Insights {
  empty: boolean;
  totalAnalyses: number;
  averageScore: number | null;
  bestScore: InsightsBestScore | null;
  resumes: InsightResumeRef[];
  scoreTrend: ScoreTrendPoint[];
  topIssues: TopIssue[];
  topMissingKeywords: TopKeyword[];
  topPresentKeywords: TopKeyword[];
  resumePerformance: ResumePerformance[];
}

// ── Analytics: Versions ─────────────────────────────────────────────────────

export interface AllVersionsTotals {
  all: number;
  uploads: number;
  rewrites: number;
}

export interface VersionsListItem {
  id: ID;
  label: string;
  versionNumber: number;
  resumeId: ID;
  resumeTitle: string;
  sourceType: VersionSourceType;
  /** Null when the version was never analyzed, never zero. */
  score: number | null;
  parentVersionId: ID | null;
  createdAt?: ISODateString;
}

export interface AllVersions {
  totals: AllVersionsTotals;
  versions: VersionsListItem[];
}

// ── Analytics: History ──────────────────────────────────────────────────────

export type HistoryEventType = "upload" | "analyze" | "rewrite";

export interface HistoryTotals {
  all: number;
  upload: number;
  analyze: number;
  rewrite: number;
}

export interface HistoryEvent {
  /** Prefixed per source (`r-`, `v-`, `a-`): three collections feed this list. */
  id: ID;
  type: HistoryEventType;
  title: string;
  subtitle: string;
  /** Short badge on the card: the version name, or the score it reached. */
  label: string;
  resumeId: ID;
  resumeTitle: string;
  at?: ISODateString;
}

export interface History {
  totals: HistoryTotals;
  events: HistoryEvent[];
}

// ── API response envelopes (match resumesApi / analyticsApi return shapes) ──

export interface ResumesListResponse {
  resumes: ResumeListItem[];
}

export interface ResumeGetResponse {
  resume: Resume;
  versions: ResumeVersionDetail[];
}

export interface ResumeVersionResponse {
  version: ResumeVersion;
}

export interface ResumeUploadResponse {
  resume: Resume;
  version: ResumeVersion;
  meta: { numPages: number };
}

export interface AnalysisResponse {
  analysis: Analysis;
}

export interface AnalysesResponse {
  analyses: Analysis[];
}

export interface RewriteResponse {
  version: ResumeVersion;
  appliedCount: number;
}

export interface DiffResponse {
  from: DiffVersionRef;
  to: DiffVersionRef;
  parts: DiffPart[];
  stats: DiffStats;
}
