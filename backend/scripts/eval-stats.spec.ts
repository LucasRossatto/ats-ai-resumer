import {
  mean,
  stdDev,
  pearson,
  ranks,
  spearman,
  pairwiseOrdering,
  needsCorrection,
  summarizeSamples,
  kendallTauB,
  kooLiBand,
  fQuantile,
  iccA1,
  completeMatrix,
  semMdc,
  type Sample,
} from './eval-stats';

describe('eval-stats', () => {
  it('mean e stdDev amostral', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([])).toBe(0);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdDev([5])).toBe(0);
  });

  it('pearson e spearman', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(ranks([10, 20, 20, 5])).toEqual([2, 3.5, 3.5, 1]);
    // monotonica mas nao linear: spearman = 1
    expect(spearman([1, 2, 3, 4], [1, 10, 100, 1000])).toBeCloseTo(1);
  });

  it('pairwiseOrdering conta apenas pares com expected diferente', () => {
    const r = pairwiseOrdering(
      ['weak', 'medium', 'strong', 'strong'],
      [30, 50, 80, 40],
    );
    // pares: w<m ok, w<s ok, w<s ok, m<s ok, m<s(40) errado => 4/5
    expect(r).toEqual({ ok: 4, total: 5, rate: 0.8 });
    expect(pairwiseOrdering(['weak', 'weak'], [1, 2]).rate).toBeNull();
  });

  describe('needsCorrection', () => {
    const normalized = {
      atsScore: 80,
      scoreBreakdown: { keywords: 20, formatting: 20, impact: 20, clarity: 20 },
      issues: [{}],
      bulletRewrites: [{}],
    };
    const raw = {
      atsScore: 80,
      scoreBreakdown: { keywords: 20, formatting: 20, impact: 20, clarity: 20 },
      issues: [{ severity: 'high' }],
      bulletRewrites: [{}],
    };

    it('false quando nada mudou', () => {
      expect(needsCorrection(raw, normalized)).toBe(false);
    });
    it('true com score fora da faixa, severidade invalida ou item descartado', () => {
      expect(needsCorrection({ ...raw, atsScore: 120 }, normalized)).toBe(true);
      expect(
        needsCorrection({ ...raw, issues: [{ severity: 'x' }] }, normalized),
      ).toBe(true);
      expect(needsCorrection({ ...raw, bulletRewrites: [] }, normalized)).toBe(
        true,
      );
      expect(needsCorrection(null, normalized)).toBe(true);
    });
  });

  it('summarizeSamples agrega as amostras', () => {
    const mk = (atsScore: number, corrected: boolean): Sample => ({
      atsScore,
      scoreBreakdown: { keywords: 10, formatting: 10, impact: 10, clarity: 10 },
      issues: 5,
      rewrites: 6,
      corrected,
      retried: false,
      latencyMs: 100,
      promptTokens: 50,
    });
    const s = summarizeSamples([mk(70, false), mk(80, true)]);
    expect(s.score).toMatchObject({ mean: 75, min: 70, max: 80 });
    expect(s.correctionRate).toBe(0.5);
    expect(s.promptTokensTotal).toBe(100);
    expect(s.breakdownMean.impact).toBe(10);
  });
});

describe('eval-stats: confiabilidade', () => {
  const amostra = (atsScore: number): Sample => ({
    atsScore,
    scoreBreakdown: {},
    issues: 0,
    rewrites: 0,
    corrected: false,
    retried: false,
    latencyMs: 0,
    promptTokens: 0,
  });

  it('kendallTauB', () => {
    const x = [0, 0, 1, 1, 2];
    expect(kendallTauB(x, [30, 40, 35, 60, 80])).toBeCloseTo(0.67082, 4);
    expect(spearman(x, [30, 40, 35, 60, 80])).toBeCloseTo(0.73786, 4);
    expect(kendallTauB(x, [30, 40, 40, 60, 40])).toBeCloseTo(0.40089, 4);
    expect(kendallTauB([0, 1, 2], [50, 50, 50])).toBeNull();
    expect(kendallTauB([1, 2], [1])).toBeNull();
  });

  it('kooLiBand', () => {
    expect(kooLiBand(0.49)).toBe('ruim');
    expect(kooLiBand(0.5)).toBe('moderado');
    expect(kooLiBand(0.75)).toBe('bom');
    expect(kooLiBand(0.9)).toBe('bom');
    expect(kooLiBand(0.91)).toBe('excelente');
  });

  it('fQuantile', () => {
    const rel = (a: number, b: number) => Math.abs(a - b) / b;
    expect(rel(fQuantile(0.975, 1, 1), 647.789)).toBeLessThan(1e-4);
    expect(rel(fQuantile(0.975, 5, 15), 3.5764)).toBeLessThan(1e-4);
    expect(rel(fQuantile(0.975, 3, 3), 15.4392)).toBeLessThan(1e-4);
    expect(rel(fQuantile(0.975, 9, 36), 2.4922)).toBeLessThan(1e-4);
  });

  const t2 = [
    [60, 62],
    [70, 70],
    [80, 78],
    [90, 90],
  ];

  it('iccA1 Shrout e Fleiss', () => {
    const r = iccA1([
      [9, 2, 5, 8],
      [6, 1, 3, 2],
      [8, 4, 6, 8],
      [7, 1, 2, 6],
      [10, 5, 6, 9],
      [6, 2, 4, 7],
    ])!;
    expect(r.msr).toBeCloseTo(11.2417, 3);
    expect(r.msc).toBeCloseTo(32.4861, 3);
    expect(r.mse).toBeCloseTo(1.0194, 3);
    expect(r.value).toBeCloseTo(0.2898, 3);
    expect(r.ci95![0]).toBeCloseTo(0.0188, 3);
    expect(r.ci95![1]).toBeCloseTo(0.7611, 3);
  });

  it('iccA1 caso pequeno e SEM/MDC', () => {
    const r = iccA1(t2)!;
    expect(r.value).toBeCloseTo(0.99352, 4);
    expect(r.ci95![0]).toBeCloseTo(0.90299, 3);
    expect(r.ci95![1]).toBeCloseTo(0.99958, 3);
    const m = semMdc(stdDev(t2.flat()), r.value)!;
    expect(m.sem).toBeCloseTo(0.9268, 3);
    expect(m.mdc95).toBeCloseTo(2.569, 3);
  });

  it('iccA1 bordas', () => {
    expect(
      iccA1([
        [50, 50],
        [50, 50],
      ]),
    ).toMatchObject({ value: null, ci95: null, reason: 'sem-variancia' });
    expect(
      iccA1([
        [60, 60],
        [80, 80],
      ]),
    ).toMatchObject({
      value: 1,
      ci95: null,
      reason: 'sem-variacao-entre-execucoes',
    });
    expect(semMdc(10, 1)).toEqual({ sem: 0, mdc95: 0 });
    expect(semMdc(10, null)).toBeNull();
    expect(semMdc(10, -0.5)!.sem).toBeGreaterThan(10);
    expect(iccA1([[1, 2]])).toBeNull();
    expect(iccA1([[1], [2]])).toBeNull();
    expect(iccA1([[1, 2], [3]])).toBeNull();
  });

  it('completeMatrix exclui linhas incompletas', () => {
    const rows = [
      ...t2.map((r, i) => ({ file: `${i}.txt`, samples: r.map(amostra) })),
      { file: 'x.txt', samples: [amostra(55), null] },
    ];
    const { matrix, excluded } = completeMatrix(rows);
    expect(matrix).toEqual(t2);
    expect(excluded).toEqual(['x.txt']);
    expect(iccA1(matrix)!.value).toBeCloseTo(0.99352, 4);
  });
});
