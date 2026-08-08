import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '@constants';
import { LoggerService } from '@application/services/logger.service';
import { AnalysisLanguage } from '@api/dto/resume/analyze-resume.dto';
import type {
  BulletRewrite,
  Issue,
  IssueSeverity,
  ScoreBreakdown,
  Strength,
} from '@domain/entities/Analysis';

export const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const responseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    'atsScore',
    'scoreBreakdown',
    'issues',
    'strengths',
    'bulletRewrites',
    'keywordsPresent',
    'keywordsMissing',
    'summary',
  ],
  properties: {
    atsScore: {
      type: Type.NUMBER,
      description: 'ATS-readiness score from 0 to 100',
    },
    scoreBreakdown: {
      type: Type.OBJECT,
      required: ['keywords', 'formatting', 'impact', 'clarity'],
      properties: {
        keywords: { type: Type.NUMBER, description: '0-25' },
        formatting: { type: Type.NUMBER, description: '0-25' },
        impact: { type: Type.NUMBER, description: '0-25' },
        clarity: { type: Type.NUMBER, description: '0-25' },
      },
    },
    issues: {
      type: Type.ARRAY,
      description: 'Exactly 5 prioritized issues',
      items: {
        type: Type.OBJECT,
        required: ['title', 'severity', 'explanation', 'fix'],
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          explanation: { type: Type.STRING },
          fix: { type: Type.STRING },
        },
      },
    },
    strengths: {
      type: Type.ARRAY,
      description: 'Exactly 5 strengths',
      items: {
        type: Type.OBJECT,
        required: ['title', 'evidence'],
        properties: {
          title: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
      },
    },
    bulletRewrites: {
      type: Type.ARRAY,
      description:
        '3-10 weak bullets rewritten to be stronger and ATS-friendly',
      items: {
        type: Type.OBJECT,
        required: ['section', 'original', 'rewritten', 'rationale'],
        properties: {
          section: { type: Type.STRING },
          original: { type: Type.STRING },
          rewritten: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
      },
    },
    keywordsPresent: { type: Type.ARRAY, items: { type: Type.STRING } },
    keywordsMissing: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: {
      type: Type.STRING,
      description: 'One short paragraph overall verdict',
    },
  },
};

export interface AnalysisInput {
  rawText: string;
  targetRole?: string;
  language?: AnalysisLanguage;
}

export interface GeneratedAnalysis {
  atsScore: number;
  scoreBreakdown: ScoreBreakdown;
  issues: Issue[];
  strengths: Strength[];
  bulletRewrites: BulletRewrite[];
  keywordsPresent: string[];
  keywordsMissing: string[];
  summary: string;
  model: string;
  promptTokens: number;
}

function buildPrompt({
  rawText,
  targetRole,
  language = AnalysisLanguage.PT_BR,
}: AnalysisInput): string {
  const isPortuguese = language === AnalysisLanguage.PT_BR;

  return [
    isPortuguese
      ? 'Você é um recrutador técnico sênior e especialista em ATS avaliando um currículo.'
      : 'You are a senior technical recruiter and ATS expert reviewing a resume.',
    targetRole
      ? isPortuguese
        ? `Cargo alvo: ${targetRole}.`
        : `Target role: ${targetRole}.`
      : isPortuguese
        ? 'Nenhum cargo alvo foi fornecido - avalie para o cargo que o candidato aparenta estar visando.'
        : 'No specific target role was provided - assess for the role the candidate appears to be aiming for.',
    isPortuguese
      ? 'Pontue o currículo de 0-100 com base na compatibilidade com ATS (correspondência de palavras-chave, formatação analisável, impacto quantificado, clareza).'
      : 'Score the resume from 0-100 based on ATS readiness (keyword match, parseable formatting, quantified impact, clarity).',
    isPortuguese
      ? 'Retorne exatamente 5 problemas priorizados, 5 pontos fortes destacados e 5-10 bullets fracos reescritos para serem mais fortes, quantificados e amigáveis ao ATS.'
      : 'Return exactly 5 prioritized issues, 5 standout strengths, and 5-10 weak bullets rewritten to be stronger, quantified, and ATS-friendly.',
    isPortuguese
      ? 'Reescritas devem preservar o significado original. Cada reescrita precisa de uma rationale de uma linha.'
      : 'Rewrites must preserve the original meaning. Each rewrite needs a one-line rationale.',
    isPortuguese
      ? 'Identifique palavras-chave claramente presentes e palavras-chave notáveis faltando para o cargo alvo aparente.'
      : 'Identify keywords clearly present and notable keywords missing for the apparent target role.',
    isPortuguese
      ? 'Seja específico e baseado em evidências, cite frases do currículo nas explicações.'
      : 'Be specific and evidence-based, cite phrasing from the resume in explanations.',
    '',
    isPortuguese ? 'TEXTO DO CURRÍCULO:' : 'RESUME TEXT:',
    '---',
    rawText,
    '---',
  ].join('\n');
}

const SEVERITIES: IssueSeverity[] = ['low', 'medium', 'high'];

const str = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const objArray = <T>(value: unknown, map: (item: any) => T): T[] =>
  Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object').map(map)
    : [];

/** Clamps to the range the Analysis schema validates, so a hallucinated
 * out-of-range score never fails the write. */
const num = (value: unknown, max: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(parsed), 0), max);
};

const toSeverity = (value: unknown): IssueSeverity =>
  SEVERITIES.includes(value as IssueSeverity)
    ? (value as IssueSeverity)
    : 'medium';

const toIssue = (item: any): Issue => ({
  title: str(item.title),
  severity: toSeverity(item.severity),
  explanation: str(item.explanation),
  fix: str(item.fix),
});

const toStrength = (item: any): Strength => ({
  title: str(item.title),
  evidence: str(item.evidence),
});

const toBulletRewrite = (item: any): BulletRewrite => ({
  section: str(item.section),
  original: str(item.original),
  rewritten: str(item.rewritten),
  rationale: str(item.rationale),
});

const toScoreBreakdown = (value: any): ScoreBreakdown => ({
  keywords: num(value?.keywords, 25),
  formatting: num(value?.formatting, 25),
  impact: num(value?.impact, 25),
  clarity: num(value?.clarity, 25),
});

/**
 * Coerces the model output into the shape persisted on Analysis. The
 * responseSchema already constrains Gemini, but the JSON is still untrusted
 * input, so every field is narrowed and clamped here.
 */
function normalize(
  parsed: any,
): Omit<GeneratedAnalysis, 'model' | 'promptTokens'> {
  const source = parsed && typeof parsed === 'object' ? parsed : {};

  return {
    atsScore: num(source.atsScore, 100),
    scoreBreakdown: toScoreBreakdown(source.scoreBreakdown),
    issues: objArray(source.issues, toIssue),
    strengths: objArray(source.strengths, toStrength),
    bulletRewrites: objArray(source.bulletRewrites, toBulletRewrite),
    keywordsPresent: strArray(source.keywordsPresent),
    keywordsMissing: strArray(source.keywordsMissing),
    summary: str(source.summary),
  };
}

@Injectable()
export class AnalysisGeneratorService {
  constructor(private readonly logger: LoggerService) {}

  get isEnabled(): boolean {
    return ai !== null;
  }

  /**
   * Unlike resume parsing, a failed analysis has no usable fallback: an empty
   * result would be persisted as a real score, so it throws instead.
   */
  async analyze(input: AnalysisInput): Promise<GeneratedAnalysis> {
    const context = {
      module: 'AnalysisGeneratorService',
      method: 'analyze',
    };

    if (!ai) {
      this.logger.err(
        'Analysis requested but Gemini is not configured',
        context,
      );
      throw new ServiceUnavailableException('Resume analysis is unavailable');
    }

    if (!input.rawText?.trim()) {
      this.logger.warning('Analysis requested with empty resume text', context);
      throw new ServiceUnavailableException('Resume has no text to analyze');
    }

    const prompt = buildPrompt(input);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { text, promptTokens } = await this.callGemini(prompt);
        const analysis = normalize(JSON.parse(text));

        this.logger.logger(
          `Resume analyzed on attempt ${attempt} - ` +
            `score: ${analysis.atsScore}, ` +
            `issues: ${analysis.issues.length}, ` +
            `rewrites: ${analysis.bulletRewrites.length}`,
          context,
        );

        return { ...analysis, model: GEMINI_MODEL, promptTokens };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt === 2) {
          this.logger.err(`Resume analysis failed: ${message}`, context);
          throw new ServiceUnavailableException('Resume analysis failed');
        }

        this.logger.warning(
          `Resume analysis attempt ${attempt} failed, retrying: ${message}`,
          context,
        );
      }
    }

    throw new ServiceUnavailableException('Resume analysis failed');
  }

  private async callGemini(
    prompt: string,
  ): Promise<{ text: string; promptTokens: number }> {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.4,
      },
    });

    const text =
      typeof result.text === 'function'
        ? (result.text as () => string)()
        : result.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return {
      text,
      promptTokens: result.usageMetadata?.promptTokenCount ?? 0,
    };
  }
}
