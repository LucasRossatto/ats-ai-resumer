// Funcoes puras do eval: sem I/O, sem rede, cobertas por eval-stats.spec.ts.

export type Expected = 'weak' | 'medium' | 'strong';

export const EXPECTED_RANK: Record<Expected, number> = {
  weak: 0,
  medium: 1,
  strong: 2,
};

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** Desvio padrao amostral (n-1). Com menos de 2 amostras devolve 0. */
export const stdDev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1),
  );
};

export const min = (xs: number[]): number => (xs.length ? Math.min(...xs) : 0);
export const max = (xs: number[]): number => (xs.length ? Math.max(...xs) : 0);

/** Correlacao de Pearson. Devolve null se alguma serie for constante. */
export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    dx += (x - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  });
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Ranks 1..n, empates recebem o rank medio. */
export function ranks(xs: number[]): number[] {
  const order = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(xs.length);
  let k = 0;
  while (k < order.length) {
    let j = k;
    while (j + 1 < order.length && order[j + 1].v === order[k].v) j++;
    const avg = (k + j) / 2 + 1;
    for (let t = k; t <= j; t++) out[order[t].i] = avg;
    k = j + 1;
  }
  return out;
}

/** Correlacao de Spearman: Pearson sobre ranks. */
export const spearman = (xs: number[], ys: number[]): number | null =>
  pearson(ranks(xs), ranks(ys));

/** Kendall tau-b (trata empates). O(n^2). Null se serie constante ou n < 2. */
export function kendallTauB(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n !== ys.length || n < 2) return null;
  let nc = 0;
  let nd = 0;
  let n1 = 0;
  let n2 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = Math.sign(xs[i] - xs[j]);
      const dy = Math.sign(ys[i] - ys[j]);
      if (dx === 0) n1++;
      if (dy === 0) n2++;
      if (dx !== 0 && dy !== 0) {
        if (dx === dy) nc++;
        else nd++;
      }
    }
  }
  const n0 = (n * (n - 1)) / 2;
  const den = Math.sqrt((n0 - n1) * (n0 - n2));
  return den === 0 ? null : (nc - nd) / den;
}

export type KooLiBand = 'ruim' | 'moderado' | 'bom' | 'excelente';

/** Faixas de Koo e Li (2016) para o ICC. */
export const kooLiBand = (x: number): KooLiBand =>
  x < 0.5 ? 'ruim' : x < 0.75 ? 'moderado' : x <= 0.9 ? 'bom' : 'excelente';

function lnGamma(x: number): number {
  const c = [
    76.18009172947, -86.505320329417, 24.014098240831,
    -1.231739572450, 0.001208650973866, -0.000005395239385,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log((2.506628274631 * ser) / x);
}

/** Fracao continua de Lentz para a beta incompleta (Numerical Recipes). */
function betacf(a: number, b: number, x: number): number {
  const TINY = 1e-300;
  const EPS = 3e-16;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a, b). */
function betaIncReg(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) -
      lnGamma(a) -
      lnGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

const fCdf = (x: number, d1: number, d2: number): number =>
  betaIncReg(d1 / 2, d2 / 2, (d1 * x) / (d1 * x + d2));

/** Quantil p da distribuicao F(d1, d2), por bissecao. */
export function fQuantile(p: number, d1: number, d2: number): number {
  let lo = 0;
  let hi = 1;
  while (fCdf(hi, d1, d2) < p && hi < 1e12) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (fCdf(mid, d1, d2) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Fracao de pares (a, b) com expected[a] < expected[b] em que a media do
 * score tambem respeita a ordem. Empates de expected sao ignorados;
 * empate de score conta como erro.
 */
export function pairwiseOrdering(
  expected: Expected[],
  scores: number[],
): { ok: number; total: number; rate: number | null } {
  let ok = 0;
  let total = 0;
  for (let a = 0; a < expected.length; a++) {
    for (let b = 0; b < expected.length; b++) {
      if (EXPECTED_RANK[expected[a]] < EXPECTED_RANK[expected[b]]) {
        total++;
        if (scores[a] < scores[b]) ok++;
      }
    }
  }
  return { ok, total, rate: total ? ok / total : null };
}

export interface AnalysisLike {
  atsScore: number;
  scoreBreakdown: Record<string, number>;
  issues: unknown[];
  bulletRewrites: unknown[];
}

/**
 * Compara o JSON bruto do modelo com o resultado de normalize(): true se
 * normalize teve de alterar algo (score fora de faixa ou nao numerico,
 * severidade invalida, itens descartados, campos ausentes).
 */
export function needsCorrection(raw: unknown, normalized: AnalysisLike) {
  if (!raw || typeof raw !== 'object') return true;
  const r = raw as Record<string, unknown>;
  if (r.atsScore !== normalized.atsScore) return true;

  const bd = (r.scoreBreakdown ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(normalized.scoreBreakdown)) {
    if (bd[key] !== value) return true;
  }

  const sameLength = (rawValue: unknown, out: unknown[]) =>
    Array.isArray(rawValue) && rawValue.length === out.length;
  if (!sameLength(r.issues, normalized.issues)) return true;
  if (!sameLength(r.bulletRewrites, normalized.bulletRewrites)) return true;

  const validSeverity = (r.issues as Array<{ severity?: unknown }>).every((i) =>
    ['low', 'medium', 'high'].includes(i?.severity as string),
  );
  return !validSeverity;
}

export interface Sample {
  atsScore: number;
  scoreBreakdown: Record<string, number>;
  issues: number;
  rewrites: number;
  corrected: boolean;
  /** true se a primeira tentativa falhou e o servico fez retry. */
  retried: boolean;
  latencyMs: number;
  promptTokens: number;
}

const BREAKDOWN_KEYS = ['keywords', 'formatting', 'impact', 'clarity'];

export function summarizeSamples(samples: Sample[]) {
  const scores = samples.map((s) => s.atsScore);
  const n = samples.length || 1;
  return {
    runs: samples.length,
    score: {
      mean: mean(scores),
      stdDev: stdDev(scores),
      min: min(scores),
      max: max(scores),
    },
    breakdownMean: Object.fromEntries(
      BREAKDOWN_KEYS.map((k) => [
        k,
        mean(samples.map((s) => s.scoreBreakdown[k] ?? 0)),
      ]),
    ),
    issuesMean: mean(samples.map((s) => s.issues)),
    rewritesMean: mean(samples.map((s) => s.rewrites)),
    correctionRate: samples.filter((s) => s.corrected).length / n,
    retryRate: samples.filter((s) => s.retried).length / n,
    latencyMsMean: mean(samples.map((s) => s.latencyMs)),
    promptTokensTotal: samples.reduce((a, s) => a + s.promptTokens, 0),
  };
}

export interface IccResult {
  value: number | null;
  ci95: [number, number] | null;
  reason: string | null;
  n: number;
  k: number;
  msr: number;
  msc: number;
  mse: number;
}

/** ICC(A,1) de McGraw e Wong (1996) com IC95%. Linhas = curriculos, colunas = execucoes. */
export function iccA1(matrix: number[][]): IccResult | null {
  const n = matrix.length;
  const k = n ? matrix[0].length : 0;
  if (n < 2 || k < 2 || matrix.some((r) => r.length !== k)) return null;
  const all = matrix.flat();
  const G = mean(all);
  const R = matrix.map(mean);
  const C = Array.from({ length: k }, (_, j) => mean(matrix.map((r) => r[j])));
  const sst = all.reduce((a, x) => a + (x - G) ** 2, 0);
  const ssr = k * R.reduce((a, r) => a + (r - G) ** 2, 0);
  const ssc = n * C.reduce((a, c) => a + (c - G) ** 2, 0);
  let sse = sst - ssr - ssc;
  if (Math.abs(sse) < 1e-9 * (sst || 1)) sse = 0;
  const msr = ssr / (n - 1);
  const msc = ssc / (k - 1);
  const mse = sse / ((n - 1) * (k - 1));
  const base = { n, k, msr, msc, mse };
  if (msr === 0 && msc === 0 && mse === 0) {
    return { ...base, value: null, ci95: null, reason: 'sem-variancia' };
  }
  if (mse === 0 && msc === 0) {
    return {
      ...base,
      value: 1,
      ci95: null,
      reason: 'sem-variacao-entre-execucoes',
    };
  }
  const icc = (msr - mse) / (msr + (k - 1) * mse + (k / n) * (msc - mse));
  const a = (k * icc) / (n * (1 - icc));
  const b = 1 + (k * icc * (n - 1)) / (n * (1 - icc));
  const v =
    (a * msc + b * mse) ** 2 /
    ((a * msc) ** 2 / (k - 1) + (b * mse) ** 2 / ((n - 1) * (k - 1)));
  const FL = fQuantile(0.975, n - 1, v);
  const FU = fQuantile(0.975, v, n - 1);
  const w = k * msc + (k * n - k - n) * mse;
  const lower = (n * (msr - FL * mse)) / (FL * w + n * msr);
  const upper = (n * (FU * msr - mse)) / (w + n * FU * msr);
  return { ...base, value: icc, ci95: [lower, upper], reason: null };
}

/** Matriz so com curriculos que tem todas as execucoes validas. */
export function completeMatrix(
  rows: { file: string; samples: (Sample | null)[] }[],
): { matrix: number[][]; excluded: string[] } {
  const matrix: number[][] = [];
  const excluded: string[] = [];
  for (const r of rows) {
    if (r.samples.every((s) => s !== null)) {
      matrix.push((r.samples as Sample[]).map((s) => s.atsScore));
    } else excluded.push(r.file);
  }
  return { matrix, excluded };
}

/** SEM e MDC95 (psicometria padrao). Null sem ICC. */
export function semMdc(
  sd: number,
  icc: number | null,
): { sem: number; mdc95: number } | null {
  if (icc === null) return null;
  const sem = sd * Math.sqrt(1 - icc);
  return { sem, mdc95: 1.96 * Math.SQRT2 * sem };
}
