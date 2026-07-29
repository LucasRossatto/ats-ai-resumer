import type { ID, ISODateString } from "./common";

// ── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  _id: ID;
  name: string;
  email: string;
  createdAt: ISODateString;
}

export interface AuthResponse {
  user: User;
}

export interface OkResponse {
  ok: boolean;
}

// ── Resume content (parsed sections) ───────────────────────────────────────

export interface ResumeLink {
  label: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: ResumeLink[];
}

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  school: string;
  period: string;
}

export interface ResumeProject {
  name: string;
  tech: string[];
  summary: string;
}

export interface ResumeCertification {
  name: string;
  year: number;
}

export interface ParsedSections {
  basics: ResumeBasics;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  languages: string[];
  interests: string[];
}

// ── Resume + version ────────────────────────────────────────────────────────

export type VersionSourceType = "upload" | "rewrite";

export interface ResumeVersion {
  _id: ID;
  label: string;
  sourceType: VersionSourceType;
  createdAt: ISODateString;
  score: number;
  rawText: string;
  parsedSections: ParsedSections;
}

export interface Resume {
  _id: ID;
  title: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  currentVersionId: ID;
  bestScore: number;
  versionCount: number;
  versions: ResumeVersion[];
}

/** Shape returned by `resumesApi.list` — no `versions` payload. */
export type ResumeShallow = Pick<
  Resume,
  "_id" | "title" | "createdAt" | "updatedAt" | "versionCount" | "bestScore"
>;

/** Shape returned by `resumesApi.get` for the `resume` field — no `versions`/`bestScore`. */
export type ResumeSummary = Pick<
  Resume,
  "_id" | "title" | "createdAt" | "updatedAt" | "currentVersionId"
>;

// ── Analysis ────────────────────────────────────────────────────────────────

export type IssueSeverity = "high" | "medium" | "low";

export interface ScoreBreakdownItem {
  label: string;
  value: number;
}

export interface AnalysisIssue {
  title: string;
  severity: IssueSeverity;
  fix: string;
}

export interface AnalysisStrength {
  title: string;
  note: string;
}

export interface BulletRewrite {
  _id: ID;
  section: string;
  original: string;
  rewritten: string;
  rationale: string;
}

export interface Analysis {
  _id: ID;
  versionId: ID;
  atsScore: number;
  model: string;
  summary: string;
  scoreBreakdown: ScoreBreakdownItem[];
  issues: AnalysisIssue[];
  strengths: AnalysisStrength[];
  keywordsPresent: string[];
  keywordsMissing: string[];
  bulletRewrites: BulletRewrite[];
}

export type DiffHunkType = "remove" | "add" | "context";

export interface DiffHunk {
  type: DiffHunkType;
  text: string;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardTotals {
  resumes: number;
  rewrites: number;
  analyses: number;
}

export interface DashboardLatestResume {
  _id: ID;
  title: string;
}

export interface ScoreSeriesPoint {
  label: string;
  score: number;
}

export interface VersionStackItem {
  id: ID;
  label: string;
  title: string;
  score: number;
}

export interface SparkPoint {
  v: number;
}

export interface KpiMetric {
  value: number;
  delta?: number;
  spark: SparkPoint[];
}

export interface KpiKeywordsMatched extends KpiMetric {
  total: number;
}

export interface DashboardKpi {
  atsScore: KpiMetric;
  versions: KpiMetric;
  issuesIdentified: KpiMetric;
  keywordsMatched: KpiKeywordsMatched;
}

export type ActivityType = "analyze" | "rewrite" | "upload";

export interface ActivityItem {
  id: ID;
  type: ActivityType;
  title: string;
  subtitle: string;
  label: string;
  at: ISODateString;
  resumeId: ID;
}

export interface Dashboard {
  totals: DashboardTotals;
  latestResume: DashboardLatestResume;
  scoreSeries: ScoreSeriesPoint[];
  versionStack: VersionStackItem[];
  kpi: DashboardKpi;
  activity: ActivityItem[];
}

// ── Analytics: Insights ─────────────────────────────────────────────────────

export interface InsightsBestScore {
  value: number;
  resumeId: ID;
  resumeTitle: string;
}

export interface ScoreTrendPoint {
  score: number;
  at: ISODateString;
  resumeTitle: string;
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

export interface Insights {
  averageScore: number;
  bestScore: InsightsBestScore;
  totalAnalyses: number;
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
  resumeId: ID;
  resumeTitle: string;
  sourceType: VersionSourceType;
  score: number;
  createdAt: ISODateString;
}

export interface AllVersions {
  totals: AllVersionsTotals;
  versions: VersionsListItem[];
}

// ── Analytics: History ──────────────────────────────────────────────────────

export interface HistoryTotals {
  all: number;
  upload: number;
  analyze: number;
  rewrite: number;
}

export interface HistoryEvent {
  id: ID;
  type: ActivityType;
  title: string;
  subtitle: string;
  label: string;
  at: ISODateString;
  resumeId: ID;
}

export interface History {
  totals: HistoryTotals;
  events: HistoryEvent[];
}

// ── API response envelopes (match resumesApi / analyticsApi return shapes) ──

export interface ResumesListResponse {
  resumes: ResumeShallow[];
}

export interface ResumeGetResponse {
  resume: ResumeSummary;
  versions: ResumeVersion[];
}

export interface ResumeVersionResponse {
  version: ResumeVersion;
}

export interface ResumeUploadResponse {
  resume: Resume;
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
  hunks: DiffHunk[];
}
