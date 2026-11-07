# Gemini integration

**English** | [Português](integracao-gemini.md)

How the backend uses Google Gemini (`@google/genai`) to analyze resumes and to structure the text extracted from the PDF: output contract, prompt, resilience, cost control and evaluation. Everything was checked against the code in `backend/src/infrastructure/ai` and `backend/src/application/services`.

## Where the AI is used

| Use | File | Temperature | On failure |
| --- | --- | --- | --- |
| **Analysis** of the resume (score, issues, strengths, rewrites) | `analysis-generator.service.ts` | 0.4 | Two attempts, then **503** |
| **Structuring** the text into sections (upload and rewrite) | `structured-parser.service.ts` | 0.1 | Two attempts, then continues with **empty sections** |

The model comes from `GEMINI_MODEL` (default `gemini-3.6-flash`). Without `GEMINI_API_KEY`, the configuration reports a fatal error at boot (`constants.ts`), and the `ai` client stays null, which turns off the section parser.

## Analysis flow

```
POST /resumes/:id/analyze
  -> check resume ownership (404 if it is not theirs)
  -> load the version (the current one, or the requested one)
  -> check the daily quota (429 if exceeded)
  -> build the prompt (PT-BR or EN, optional target role)
  -> call Gemini with a response schema
  -> normalize and clamp the values
  -> store the analysis and link it to the version
```

## Output contract

The call uses `responseMimeType: 'application/json'` and a `responseSchema`, so the model must return JSON in the expected shape:

| Field | Content |
| --- | --- |
| `atsScore` | score from 0 to 100 |
| `scoreBreakdown` | four axes, 0 to 25 each |
| `issues` | prioritized issues, with severity |
| `strengths` | strengths |
| `bulletRewrites` | weak sentences rewritten (original and suggestion) |
| `keywordsPresent` and `keywordsMissing` | keywords found and missing |
| `summary` | summary |

### Why normalize even with a schema

The schema constrains the shape, but does not guarantee the values make sense. The `normalize` function treats the response as **untrusted data**: it converts types and clamps scores to valid ranges (0 to 100, and 0 to 25 per axis). What gets past it is what goes to the database and the screen.

## Prompt

Built in `buildPrompt`, in Portuguese or English depending on the requested language.

- **Role and criteria:** the score considers how well a screening robot can read the resume (keywords, parseable formatting, quantified impact, clarity).
- **Optional target role**, which steers the keywords.
- **Fixed quantities:** 5 prioritized issues, 5 strengths and 5 to 10 rewritten sentences.
- **Plain language for non-experts:** the prompt forbids the acronym "ATS" and the word "bullet" in answers, replacing them with "screening robot" and "experience sentences".
- **Prompt injection defense:**
  - the resume text is cut at `MAX_RESUME_CHARS` (30,000 characters);
  - the `<resume>` and `</resume>` tags are removed from the content repeatedly until none is left (`stripTag`), so even a nested tag like `<</resume>/resume>` cannot "close" the block (tested in `analysis-prompt.spec.ts`);
  - the text goes between `<resume>` and `</resume>`, and the prompt says that inside there is only data to evaluate, ignoring instructions.

> This reduces the risk but does not eliminate it: prompt injection has no complete solution today. That is why the output still goes through `normalize`, and the model can only write analysis data, with no access to tools or the database.

## Resilience

- **Two attempts** with a 2 s delay between them (`RETRY_DELAY_MS`), covered by tests with fake timers.
- **No text or no key:** the analysis answers 503 without calling Gemini.
- **Final failure:** `ServiceUnavailableException` (503) with a generic message. **There is no fallback analysis**: inventing a score without the model would be worse than saying so.
- The section parser, by contrast, **degrades gracefully**: if it fails, the upload continues with empty sections, and on rewrite the system uses the patched version.

## Cost control

| Control | Value | Where |
| --- | --- | --- |
| Daily analyses per user | `ANALYSIS_DAILY_LIMIT` (default **20**, UTC day) | `analysis.service.ts` |
| Analysis rate limit | 5 per minute | `analysis.controller.ts` |
| Upload and creation rate limit | 10 per minute | controllers |
| Global API limit | 100 per minute | `app.module.ts` |
| Size of the text sent (analysis and parser) | 30,000 characters | `MAX_RESUME_CHARS` |
| Resumes created per day / versions per resume per day (each calls the parser) | `PARSE_DAILY_LIMIT` (default **20**, UTC day) | `resume.service.ts` |
| Max time and response size | 30 s and `maxOutputTokens` on every call | `prompt-safety.ts` |
| Prompt tokens | `promptTokens` returned by Gemini and stored with the analysis | `analysis-generator.service.ts` |

### Real limits

- The free Gemini tier allows few requests per day **in total**, summed across all users. The per-user quota does not protect against that: there is no global cap.
- Upload and rewrite also call Gemini (to structure the text) and **do not count** toward the daily quota.
- The quota check and the analysis write are not atomic, so simultaneous requests can slightly exceed the limit.

## Evaluation (`pnpm eval`)

The script `backend/scripts/eval-analysis.ts` runs the analysis on sample resumes (`test/fixtures/manifest.json`) and measures score **consistency**:

```bash
pnpm eval --dry-run          # simulates, without calling the API
pnpm eval --runs 3 --yes     # runs for real, 3 times per resume
```

The statistics (`eval-stats.ts`, tested in `eval-stats.spec.ts`) include standard deviation across runs, Pearson and Spearman correlations and the rate of responses that needed correction by `normalize`. The report template is in [`backend/docs/eval.md`](../backend/docs/eval.md) (in Portuguese).

**Current state:** the script exists and has only run partially, because of the free quota. **There are no published numbers yet**, and this document quotes none.

## How to read the score

The score is a **language model's opinion**, not a measurement from a real ATS. It is useful to compare versions of the same resume against each other. At temperature 0.4, two runs on the same text can differ, and the eval exists to measure that variation.

## Environment variables

| Variable | Effect |
| --- | --- |
| `GEMINI_API_KEY` | Required. Google AI Studio API key |
| `GEMINI_MODEL` | Model used (default `gemini-3.6-flash`) |
| `ANALYSIS_DAILY_LIMIT` | Analyses per user per day (default 20) |
| `PARSE_DAILY_LIMIT` | Resumes created per user per day and versions per resume per day (default 20) |

## Suggested next steps

A global daily analysis cap; count upload and rewrite in the quota; metrics for calls, failures, latency and tokens (see [observability](observability.en.md#known-gaps)); publish the eval numbers with `pnpm eval --runs 3 --yes`.
