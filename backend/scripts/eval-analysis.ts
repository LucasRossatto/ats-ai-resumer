/* eslint-disable max-len -- linhas de tabela Markdown */
/* Eval do LLM: pnpm eval [--runs N] [--yes] [--dry-run]
 * Chama AnalysisGeneratorService.analyze N vezes por curriculo fixture e
 * mede a estabilidade e a coerencia do atsScore. Ver docs/eval.md. */
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import {
  type Expected,
  type Sample,
  mean,
  stdDev,
  spearman,
  kendallTauB,
  kooLiBand,
  iccA1,
  completeMatrix,
  semMdc,
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
  /** Valor lido da chamada real; null no gerador falso ou se nunca chamou. */
  temperature: () => number | null;
  promptHash: string | null;
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
    temperature: () => null,
    promptHash: null,
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
  let temperature: number | null = null;
  const original = mod.ai.models.generateContent.bind(mod.ai.models);
  mod.ai.models.generateContent = async (params: {
    config?: { temperature?: number };
  }) => {
    calls++;
    temperature = params.config?.temperature ?? null;
    const result = await original(params);
    const t = result.text;
    lastRaw = typeof t === 'function' ? t.call(result) : t;
    return result;
  };

  return {
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    temperature: () => temperature,
    promptHash: createHash('sha256')
      .update(
        mod.buildPrompt({ rawText: '{{RESUME}}', language: 'pt-BR' }) +
          '\n' +
          mod.buildPrompt({ rawText: '{{RESUME}}', language: 'en' }),
      )
      .digest('hex')
      .slice(0, 12),
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
    process.env.JWT_REFRESH_SECRET ||=
      'eval-only-placeholder-secret-9876543210';
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
    const samples: (Sample | null)[] = [];
    let failures = 0;
    for (let i = 0; i < RUNS; i++) {
      try {
        samples.push(await gen.run(text, f.language, i));
      } catch (e) {
        samples.push(null);
        failures++;
        console.warn(`  falha em ${f.file} #${i + 1}: ${(e as Error).message}`);
      }
    }
    const summary = summarizeSamples(
      samples.filter((s): s is Sample => s !== null),
    );
    console.log(
      `${f.file}: media ${fmt(summary.score.mean, 1)} dp ${fmt(summary.score.stdDev, 1)}`,
    );
    rows.push({ ...f, failures, samples, ...summary });
  }

  const ok = rows.filter((r) => r.runs > 0);
  const means = ok.map((r) => r.score.mean);
  const ranksExpected = ok.map((r) => EXPECTED_RANK[r.expected]);
  const { matrix, excluded } = completeMatrix(rows);
  const iccRaw = iccA1(matrix);
  const iccBands = iccRaw?.ci95
    ? [kooLiBand(iccRaw.ci95[0]), kooLiBand(iccRaw.ci95[1])]
    : iccRaw?.value != null
      ? [kooLiBand(iccRaw.value)]
      : null;
  const icc = iccRaw && {
    model: 'ICC(A,1)',
    value: iccRaw.value,
    ci95: iccRaw.ci95,
    band: iccBands,
    reason: iccRaw.reason,
    n: iccRaw.n,
    k: iccRaw.k,
    excluded,
    msr: iccRaw.msr,
    msc: iccRaw.msc,
    mse: iccRaw.mse,
  };
  const sm = semMdc(stdDev(matrix.flat()), icc?.value ?? null);
  const global = {
    meanStdDev: mean(ok.map((r) => r.score.stdDev)),
    meanScoreStdAcrossResumes: stdDev(means),
    icc,
    sem: sm?.sem ?? null,
    mdc95: sm?.mdc95 ?? null,
    spearman: spearman(ranksExpected, means),
    kendallTauB: kendallTauB(ranksExpected, means),
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

  let gitCommit: string | null = null;
  try {
    gitCommit = execSync('git rev-parse --short HEAD', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    // sem git disponivel: segue com null.
  }
  // Com falhas definitivas (cota, 503) o relatorio parece resultado mas nao e:
  // nao sobrescreve docs/ com ele.
  const partial = global.failures > 0;
  const meta = {
    date: new Date().toISOString(),
    model: gen.model,
    runs: RUNS,
    dryRun: DRY,
    temperature: gen.temperature(),
    promptHash: gen.promptHash,
    gitCommit,
    resumes: manifest.length,
    partial,
  };
  const outDir =
    DRY || partial
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

interface Meta {
  date: string;
  model: string;
  runs: number;
  dryRun: boolean;
  temperature: number | null;
  promptHash: string | null;
  gitCommit: string | null;
  resumes: number;
  partial: boolean;
}

const ICC_REASONS: Record<string, string> = {
  'sem-variancia': 'todas as notas são iguais, não há variância para medir',
  'sem-variacao-entre-execucoes': 'nenhuma variação observada entre execuções',
};

function renderMarkdown(
  meta: Meta,
  g: Record<string, any>,
  rows: Array<Record<string, any>>,
): string {
  const b = (r: Record<string, any>) => r.breakdownMean;
  const pt = (n: number | null, d = 2) => fmt(n, d).replace('.', ',');
  const icc = g.icc as {
    value: number | null;
    ci95: [number, number] | null;
    band: string[] | null;
    reason: string | null;
    n: number;
    k: number;
    excluded: string[];
  } | null;
  const completos = rows.filter((r) =>
    r.samples.every((s: unknown) => s),
  ).length;

  const product: string[] = [];
  if (g.mdc95 === null) {
    product.push('- MDC95 e SEM não calculados (dependem do ICC).');
  } else if (g.mdc95 === 0) {
    product.push(
      '- Nenhuma variação de nota observada entre execuções (MDC95 = 0; SEM = 0).',
    );
  } else {
    product.push(
      `- Variações de nota menores que ${Math.ceil(g.mdc95)} pontos entre duas análises podem ser ruído da IA (MDC95 = ${pt(g.mdc95, 1)}; SEM = ${pt(g.sem, 1)}).`,
    );
  }
  if (!icc) {
    product.push(
      meta.runs < 2
        ? '- ICC não calculado: são necessárias ao menos 2 execuções por currículo.'
        : `- ICC não calculado: apenas ${completos} currículo(s) com todas as execuções válidas (mínimo 2).`,
    );
  } else if (icc.value !== null && icc.ci95) {
    const [lo, hi] = icc.band as string[];
    product.push(
      `- Estabilidade: ICC(A,1) = ${pt(icc.value)}, IC95% de ${pt(icc.ci95[0])} a ${pt(icc.ci95[1])}: ${lo === hi ? lo : `de ${lo} a ${hi}`} (n = ${icc.n} currículos, k = ${icc.k} execuções).`,
    );
  } else {
    product.push(
      `- Estabilidade: ICC(A,1) = ${icc.value === null ? 'n/a' : pt(icc.value)}, sem IC95%: ${ICC_REASONS[icc.reason ?? ''] ?? icc.reason} (n = ${icc.n} currículos, k = ${icc.k} execuções).`,
    );
  }
  if (icc && icc.excluded.length) {
    product.push(
      `- Currículos fora do ICC por execuções ausentes: ${icc.excluded.join(', ')}.`,
    );
  }

  const lines = [
    '# Eval do score do LLM',
    '',
    'Como rodar (precisa de `GEMINI_API_KEY` real no `.env`): `pnpm eval` (N=5, pede confirmação), `pnpm eval --runs 3 --yes` ou `pnpm eval --dry-run --yes` (gerador falso, sem rede). Este arquivo e o `eval.json` são reescritos a cada execução.',
    '',
    ...(meta.dryRun
      ? [
          '> ATENÇÃO: gerado com `--dry-run` (gerador falso). Os números não medem o modelo.',
          '',
        ]
      : []),
    ...(meta.partial
      ? [
          `> EXECUÇÃO PARCIAL: ${g.failures} de ${meta.resumes * meta.runs} chamadas falharam (503 ou cota). Este relatório não substitui \`docs/eval.md\`.`,
          '',
        ]
      : []),
    '## Configuração',
    '',
    `- Data: ${meta.date}`,
    `- Modelo: ${meta.model}`,
    `- Temperatura: ${meta.temperature ?? 'n/a'}`,
    `- Hash do prompt: ${meta.promptHash ?? 'n/a'} (commit ${meta.gitCommit ?? 'n/a'})`,
    `- Execuções por currículo (N): ${meta.runs}`,
    `- Currículos: ${meta.resumes}`,
    '',
    '## Resultado para o produto',
    '',
    ...product,
    '',
    '## Coerência com o rótulo',
    '',
    `- Spearman (esperado x média): ${pt(g.spearman)}`,
    `- Kendall tau-b (esperado x média): ${pt(g.kendallTauB)}`,
    `- Pares ordenados corretamente: ${g.pairwise.ok}/${g.pairwise.total}` +
      (g.pairwise.rate === null ? '' : ` (${fmt(g.pairwise.rate * 100, 0)}%)`),
    `- Currículos considerados: ${rows.filter((r) => r.runs > 0).length} de ${meta.resumes}`,
    '',
    '## Por currículo',
    '',
    '| Arquivo | Esperado | Execuções | Média | DP | Mín | Máx | kw | fmt | imp | clar | Issues | Rewrites | Correção | Retry | Lat. (ms) | Tokens |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.file} | ${r.expected} | ${r.runs}/${meta.runs} | ${fmt(r.score.mean, 1)} | ${fmt(r.score.stdDev, 1)} | ${r.score.min} | ${r.score.max} | ` +
        `${fmt(b(r).keywords, 1)} | ${fmt(b(r).formatting, 1)} | ${fmt(b(r).impact, 1)} | ${fmt(b(r).clarity, 1)} | ` +
        `${fmt(r.issuesMean, 1)} | ${fmt(r.rewritesMean, 1)} | ${fmt(r.correctionRate * 100, 0)}% | ` +
        `${fmt(r.retryRate * 100, 0)}% | ${fmt(r.latencyMsMean, 0)} | ${r.promptTokensTotal} |`,
    ),
    '',
    '## Operação',
    '',
    `- Respostas corrigidas pelo normalize: ${fmt(g.correctionRate * 100, 1)}%`,
    `- Respostas com retry: ${fmt(g.retryRate * 100, 1)}%; falhas definitivas: ${g.failures}`,
    `- Latência média: ${fmt(g.latencyMsMean, 0)} ms; promptTokens total: ${g.promptTokensTotal}`,
    `- Desvio padrão médio do atsScore (mesmo currículo): ${pt(g.meanStdDev)}`,
    '',
    '## Limitações',
    '',
    '- "Correção" compara o JSON bruto da última tentativa com o resultado de `normalize` (score fora da faixa, severidade inválida, itens descartados). Não há acesso ao `normalize` sem alterar `src`.',
    '- Apenas `promptTokens` é exposto pelo serviço; tokens de saída são estimados na previsão de custo.',
    '- O rótulo `expected` (weak/medium/strong) é uma anotação subjetiva em `test/fixtures/manifest.json`; 10 currículos dão correlação com baixo poder estatístico.',
    `- Com ${meta.resumes} currículos, o IC95% do ICC é largo; leia a faixa do intervalo, não o valor pontual.`,
    '- Estabilidade não é acurácia: uma nota pode se repetir sempre e ainda estar enviesada. O ICC mede só repetibilidade.',
    '- O MDC vale para estes currículos fictícios, este modelo, este prompt e esta temperatura. Troca de modelo ou de prompt exige rodar o eval de novo.',
    '- Spearman e Kendall tau-b não têm intervalo de confiança aqui; com 10 itens e 3 níveis de rótulo, são indicativos.',
    '- As fórmulas de SEM e MDC são o padrão de psicometria e ainda precisam de confirmação (ver spec).',
    '',
  ];
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
