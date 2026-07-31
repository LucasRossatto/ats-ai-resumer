import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '@constants';
import { LoggerService } from '@application/services/logger.service';
import type {
  Basics,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  Link,
  ParsedSections,
  ProjectItem,
} from '@domain/entities/ResumeVersion';

export const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const linkSchema: Schema = {
  type: Type.OBJECT,
  required: ['label', 'url'],
  properties: {
    label: { type: Type.STRING },
    url: { type: Type.STRING },
  },
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    'basics',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'interests',
  ],
  properties: {
    basics: {
      type: Type.OBJECT,
      required: ['name', 'title', 'location', 'email', 'phone', 'links'],
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        location: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        links: { type: Type.ARRAY, items: linkSchema },
      },
    },
    summary: { type: Type.STRING },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['company', 'role', 'period', 'location', 'bullets'],
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          period: { type: Type.STRING },
          location: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['degree', 'school', 'period', 'location', 'details'],
        properties: {
          degree: { type: Type.STRING },
          school: { type: Type.STRING },
          period: { type: Type.STRING },
          location: { type: Type.STRING },
          details: { type: Type.STRING },
        },
      },
    },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'description', 'tech', 'links'],
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tech: { type: Type.ARRAY, items: { type: Type.STRING } },
          links: { type: Type.ARRAY, items: linkSchema },
        },
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'issuer', 'year'],
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          year: { type: Type.STRING },
        },
      },
    },
    languages: { type: Type.ARRAY, items: { type: Type.STRING } },
    interests: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
};

export const EMPTY: ParsedSections = {
  basics: {
    name: '',
    title: '',
    location: '',
    email: '',
    phone: '',
    links: [],
  },
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  languages: [],
  interests: [],
};

function buildPrompt(rawText: string): string {
  return [
    'You are a resume parser. The input is text extracted from a PDF — lines may be jumbled or out of natural reading order.',
    '',
    'Extract structured data:',
    '- basics: name, professional title, location, email, phone, social links (LinkedIn / GitHub / portfolio etc.; label like "LinkedIn", full URL)',
    '- summary: the professional summary paragraph (rejoin if split across lines)',
    '- experience: jobs most recent first, with company, role, period (preserve original date format), location if available, and bullet points',
    '- education: degree, school, period, location, optional details',
    '- skills: flat array of technical skills',
    '- projects: name, one-sentence description, optional tech tags, optional links',
    '- certifications: name, issuer, year',
    '- languages: flat array',
    '- interests: flat array',
    '',
    'Rules:',
    '- Be conservative: omit fields that are not clearly present. Use empty strings/arrays where missing.',
    '- Do not invent or paraphrase — extract verbatim where possible.',
    '- Each experience bullet should read as a complete sentence.',
    "- Preserve original date formats (e.g. 'Jan 2022 – Dec 2023').",
    '',
    'RESUME TEXT:',
    '',
    rawText,
    '',
  ].join('\n');
}

const str = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const objArray = <T>(value: unknown, map: (item: any) => T): T[] =>
  Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object').map(map)
    : [];

const toLink = (item: any): Link => ({
  label: str(item.label),
  url: str(item.url),
});

const toBasics = (value: any): Basics => ({
  name: str(value?.name),
  title: str(value?.title),
  location: str(value?.location),
  email: str(value?.email),
  phone: str(value?.phone),
  links: objArray(value?.links, toLink),
});

const toExperience = (item: any): ExperienceItem => ({
  company: str(item.company),
  role: str(item.role),
  location: str(item.location),
  period: str(item.period),
  bullets: strArray(item.bullets),
});

const toEducation = (item: any): EducationItem => ({
  degree: str(item.degree),
  school: str(item.school),
  location: str(item.location),
  period: str(item.period),
  details: str(item.details),
});

const toProject = (item: any): ProjectItem => ({
  name: str(item.name),
  description: str(item.description),
  tech: strArray(item.tech),
  links: objArray(item.links, toLink),
});

const toCertification = (item: any): CertificationItem => ({
  name: str(item.name),
  issuer: str(item.issuer),
  year: str(item.year),
});

/**
 * Coerces the model output into the exact ParsedSections shape stored in
 * ResumeVersion. The responseSchema already constrains Gemini, but the JSON is
 * still untrusted input, so every field is narrowed here.
 */
function normalize(parsed: any): ParsedSections {
  if (!parsed || typeof parsed !== 'object') {
    return EMPTY;
  }

  return {
    basics: toBasics(parsed.basics),
    summary: str(parsed.summary),
    experience: objArray(parsed.experience, toExperience),
    education: objArray(parsed.education, toEducation),
    projects: objArray(parsed.projects, toProject),
    skills: strArray(parsed.skills),
    certifications: objArray(parsed.certifications, toCertification),
    languages: strArray(parsed.languages),
    interests: strArray(parsed.interests),
  };
}

@Injectable()
export class StructuredParserService {
  constructor(private readonly logger: LoggerService) {}

  get isEnabled(): boolean {
    return ai !== null;
  }

  async parseResume(rawText: string): Promise<ParsedSections> {
    const context = {
      module: 'StructuredParserService',
      method: 'parseResume',
    };

    if (!ai || !rawText?.trim()) {
      this.logger.warning(
        'Structured parse skipped - Gemini is not configured or the text is empty',
        context,
      );
      return EMPTY;
    }

    const prompt = buildPrompt(rawText);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.1,
          },
        });

        const text =
          typeof result.text === 'function'
            ? (result.text as () => string)()
            : result.text;

        if (!text) {
          throw new Error('Empty response');
        }

        const parsed = normalize(JSON.parse(text));

        this.logger.logger(
          `Resume parsed on attempt ${attempt} - ` +
            `experience: ${parsed.experience.length}, ` +
            `skills: ${parsed.skills.length}`,
          context,
        );

        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt === 2) {
          this.logger.err(`Structured parse failed: ${message}`, context);
          return EMPTY;
        }

        this.logger.warning(
          `Structured parse attempt ${attempt} failed, retrying: ${message}`,
          context,
        );
      }
    }

    return EMPTY;
  }
}
