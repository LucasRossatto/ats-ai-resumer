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
