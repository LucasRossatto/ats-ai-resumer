/* eslint-disable max-len -- linhas de tabela Markdown */
/* Eval do LLM: pnpm eval [--runs N] [--yes] [--dry-run]
 * Chama AnalysisGeneratorService.analyze N vezes por curriculo fixture e
 * mede a estabilidade e a coerencia do atsScore. Ver docs/eval.md. */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import {
  type Expected,
  type Sample,
  mean,
  stdDev,
  pearson,
  spearman,
  pairwiseOrdering,
  needsCorrection,
  summarizeSamples,
  EXPECTED_RANK,
} from './eval-stats';

interface Fixture {
  file: string;
  expected: Expected;
  area: string;
  language: string;
}
interface Generator {
  model: string;
  run(text: string, language: string, seed: number): Promise<Sample>;
}

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const runsIdx = args.indexOf('--runs');
const RUNS = runsIdx >= 0 ? Number(args[runsIdx + 1]) : 5;
const DRY = flag('dry-run');

// Estimativa grosseira, ajuste conforme a tabela de precos vigente do modelo.
const PRICE_IN_PER_M = Number(process.env.EVAL_PRICE_IN_PER_M ?? 0.3);
const PRICE_OUT_PER_M = Number(process.env.EVAL_PRICE_OUT_PER_M ?? 2.5);
const EST_OUT_TOKENS = 2500;

const fmt = (n: number | null, d = 2) => (n === null ? 'n/a' : n.toFixed(d));

/** Gerador falso deterministico: mesma entrada, mesma saida, sem rede. */
function fakeGenerator(): Generator {
  const hash = (s: string) =>
    [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return {
    model: 'dry-run-fake',
    async run(text, _language, seed) {
      const h = hash(text);
      const base = 35 + (h % 45);
      const jitter = ((h + seed * 7919) % 7) - 3;
      const raw = Math.round(base + jitter + (seed % 5 === 4 ? 40 : 0));
      const atsScore = Math.min(100, Math.max(0, raw));
      const q = Math.round(atsScore / 4);
      return {
        atsScore,
        scoreBreakdown: { keywords: q, formatting: q, impact: q, clarity: q },
        issues: 5,
        rewrites: 5 + (h % 4),
        corrected: raw !== atsScore,
        retried: false,
        latencyMs: 100 + (h % 50),
        promptTokens: Math.round(text.length / 3),
      };
    },
  };
}

/** Gerador real: instancia o servico sem subir o Nest e intercepta o JSON
 * bruto do Gemini para medir quantas respostas o normalize corrigiu. */
async function realGenerator(): Promise<Generator> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const moduleAlias = require('module-alias');
  const src = path.join(ROOT, 'src');
  moduleAlias.addAliases({
    '@constants': path.join(src, 'constants'),
    '@domain': path.join(src, 'domain'),
    '@application': path.join(src, 'application'),
    '@infrastructure': path.join(src, 'infrastructure'),
    '@api': path.join(src, 'api'),
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(
    path.join(src, 'infrastructure/ai/analysis-generator.service'),
  );
  const silent = { logger() {}, warning() {}, err() {} };
  const service = new mod.AnalysisGeneratorService(silent);
  if (!mod.ai) throw new Error('Gemini client nao inicializado');

  let lastRaw = '';
  let calls = 0;
  const original = mod.ai.models.generateContent.bind(mod.ai.models);
  mod.ai.models.generateContent = async (params: unknown) => {
    calls++;
    const result = await original(params);
    const t = result.text;
    lastRaw = typeof t === 'function' ? t.call(result) : t;
    return result;
  };

  return {
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    async run(text, language) {
      calls = 0;
      const started = Date.now();
      const out = await service.analyze({
        rawText: text,
        language: language === 'en' ? 'en' : 'pt-BR',
      });
      const latencyMs = Date.now() - started;
      let corrected = true;
      try {
        corrected = needsCorrection(JSON.parse(lastRaw), out);
      } catch {
        // JSON invalido na ultima tentativa: conta como corrigido.
      }
      return {
        atsScore: out.atsScore,
        scoreBreakdown: out.scoreBreakdown,
        issues: out.issues.length,
        rewrites: out.bulletRewrites.length,
        corrected,
        retried: calls > 1,
        latencyMs,
        promptTokens: out.promptTokens,
      };
    },
  };
}

const confirm = (question: string) =>
  new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (a) => {
      rl.close();
      resolve(/^(y|s)/i.test(a.trim()));
    });
  });

async function main() {
  if (!Number.isInteger(RUNS) || RUNS < 1) throw new Error('--runs invalido');
  const fixturesDir = path.join(ROOT, 'test/fixtures');
  const manifest: Fixture[] = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'manifest.json'), 'utf8'),
  );

  const calls = manifest.length * RUNS;
  const chars = manifest.reduce(
    (a, f) =>
      a +
      fs.readFileSync(path.join(fixturesDir, 'resumes', f.file), 'utf8').length,
    0,
  );
  const inTokens = (chars / 3) * RUNS + 400 * calls;
  const cost =
    (inTokens / 1e6) * PRICE_IN_PER_M +
    ((EST_OUT_TOKENS * calls) / 1e6) * PRICE_OUT_PER_M;
  console.log(
    `${manifest.length} curriculos x ${RUNS} execucoes = ${calls} chamadas.\n` +
      `Estimativa: ~${Math.round(inTokens)} tokens de entrada, ` +
      `~${EST_OUT_TOKENS * calls} de saida, ~US$ ${cost.toFixed(2)} ` +
      `(precos por 1M: entrada ${PRICE_IN_PER_M}, saida ${PRICE_OUT_PER_M}; ` +
      'ajuste via EVAL_PRICE_IN_PER_M / EVAL_PRICE_OUT_PER_M).',
  );

  let gen: Generator;
  if (DRY) {
    console.log('Modo --dry-run: gerador falso, sem rede.');
    gen = fakeGenerator();
  } else {
    // O eval só chama o LLM, mas constants.ts valida os segredos de auth no
    // import. Placeholders evitam exigir (ou expor) segredos que ele não usa.
    process.env.JWT_SECRET ||= 'eval-only-placeholder-secret-0123456789';
    process.env.JWT_REFRESH_SECRET ||= 'eval-only-placeholder-secret-9876543210';
    if (!process.env.GEMINI_API_KEY) {
      // constants.ts carrega o .env, mas conferimos cedo para dar erro claro.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('dotenv').config({ path: path.join(ROOT, '.env') });
    }
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'x') {
      throw new Error(
        'GEMINI_API_KEY real e obrigatoria (use --dry-run para testar).',
      );
    }
    if (!flag('yes') && !(await confirm('Executar chamadas reais? [s/N] '))) {
      console.log('Cancelado.');
      return;
    }
    gen = await realGenerator();
  }

  const rows = [];
  for (const f of manifest) {
    const text = fs.readFileSync(
      path.join(fixturesDir, 'resumes', f.file),
      'utf8',
    );
    const samples: Sample[] = [];
    let failures = 0;
    for (let i = 0; i < RUNS; i++) {
      try {
        samples.push(await gen.run(text, f.language, i));
      } catch (e) {
        failures++;
        console.warn(`  falha em ${f.file} #${i + 1}: ${(e as Error).message}`);
      }
    }
    const summary = summarizeSamples(samples);
    console.log(
      `${f.file}: media ${fmt(summary.score.mean, 1)} dp ${fmt(summary.score.stdDev, 1)}`,
    );
    rows.push({ ...f, failures, ...summary });
  }

  const ok = rows.filter((r) => r.runs > 0);
  const means = ok.map((r) => r.score.mean);
  const ranksExpected = ok.map((r) => EXPECTED_RANK[r.expected]);
  const global = {
    meanStdDev: mean(ok.map((r) => r.score.stdDev)),
    meanScoreStdAcrossResumes: stdDev(means),
    pearson: pearson(ranksExpected, means),
    spearman: spearman(ranksExpected, means),
    pairwise: pairwiseOrdering(
      ok.map((r) => r.expected),
      means,
    ),
    correctionRate: mean(ok.map((r) => r.correctionRate)),
    retryRate: mean(ok.map((r) => r.retryRate)),
    failures: rows.reduce((a, r) => a + r.failures, 0),
    latencyMsMean: mean(ok.map((r) => r.latencyMsMean)),
    promptTokensTotal: ok.reduce((a, r) => a + r.promptTokensTotal, 0),
  };

  const meta = {
    date: new Date().toISOString(),
    model: gen.model,
    runs: RUNS,
    dryRun: DRY,
  };
  // Com falhas definitivas (cota, 503) o relatorio parece resultado mas nao e:
  // nao sobrescreve docs/ com ele.
  const partial = global.failures > 0;
  const outDir = DRY || partial
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'eval-'))
    : path.join(ROOT, 'docs');
  if (partial && !DRY) {
    console.log(
      `\n${global.failures} falha(s) definitiva(s): docs/eval.* NAO foi atualizado. Rode de novo quando a cota/servico normalizar.`,
    );
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'eval.json'),
    JSON.stringify({ meta, global, rows }, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(outDir, 'eval.md'),
    renderMarkdown(meta, global, rows),
  );
  console.log(`\nSaida em ${outDir} (eval.md, eval.json)`);
}

function renderMarkdown(
  meta: { date: string; model: string; runs: number; dryRun: boolean },
  g: Record<string, any>,
  rows: Array<Record<string, any>>,
): string {
  const b = (r: Record<string, any>) => r.breakdownMean;
  const lines = [
    '# Eval do score do LLM',
    '',
    'Como rodar (precisa de `GEMINI_API_KEY` real no `.env`): `pnpm eval` (N=5, pede confirmacao), `pnpm eval --runs 3 --yes` ou `pnpm eval --dry-run --yes` (gerador falso, sem rede). Este arquivo e o `eval.json` sao reescritos a cada execucao.',
    '',
    meta.dryRun
      ? '> ATENCAO: gerado com `--dry-run` (gerador falso). Os numeros nao medem o modelo.'
      : '',
    `- Data: ${meta.date}`,
    `- Modelo: ${meta.model}`,
    `- Execucoes por curriculo (N): ${meta.runs}`,
    '',
    '## Por curriculo',
    '',
    '| Arquivo | Esperado | Media | Dp | Min | Max | kw | fmt | imp | clar | Issues | Rewrites | Correcao | Retry | Lat. (ms) | Tokens |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.file} | ${r.expected} | ${fmt(r.score.mean, 1)} | ${fmt(r.score.stdDev, 1)} | ${r.score.min} | ${r.score.max} | ` +
        `${fmt(b(r).keywords, 1)} | ${fmt(b(r).formatting, 1)} | ${fmt(b(r).impact, 1)} | ${fmt(b(r).clarity, 1)} | ` +
        `${fmt(r.issuesMean, 1)} | ${fmt(r.rewritesMean, 1)} | ${fmt(r.correctionRate * 100, 0)}% | ` +
        `${fmt(r.retryRate * 100, 0)}% | ${fmt(r.latencyMsMean, 0)} | ${r.promptTokensTotal} |`,
    ),
    '',
    '## Resumo global',
    '',
    `- Desvio padrao medio do atsScore (mesmo curriculo, ${meta.runs} execucoes): ${fmt(g.meanStdDev)}`,
    `- Pearson (esperado x media): ${fmt(g.pearson)}`,
    `- Spearman (esperado x media): ${fmt(g.spearman)}`,
    `- Pares ordenados corretamente: ${g.pairwise.ok}/${g.pairwise.total}` +
      (g.pairwise.rate === null ? '' : ` (${fmt(g.pairwise.rate * 100, 0)}%)`),
    `- Respostas corrigidas pelo normalize: ${fmt(g.correctionRate * 100, 1)}%`,
    `- Respostas com retry: ${fmt(g.retryRate * 100, 1)}%; falhas definitivas: ${g.failures}`,
    `- Latencia media: ${fmt(g.latencyMsMean, 0)} ms; promptTokens total: ${g.promptTokensTotal}`,
    '',
    '## Limitacoes',
    '',
    '- "Correcao" compara o JSON bruto da ultima tentativa com o resultado de `normalize` (score fora da faixa, severidade invalida, itens descartados). Nao ha acesso ao `normalize` sem alterar `src`.',
    '- Apenas `promptTokens` e exposto pelo servico; tokens de saida sao estimados na previsao de custo.',
    '- O rotulo `expected` (weak/medium/strong) e uma anotacao subjetiva em `test/fixtures/manifest.json`; 10 curriculos dao correlacao com baixo poder estatistico.',
    '',
  ];
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
