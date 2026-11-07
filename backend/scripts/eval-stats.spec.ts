import {
  mean,
  stdDev,
  pearson,
  ranks,
  spearman,
  pairwiseOrdering,
  needsCorrection,
  summarizeSamples,
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
