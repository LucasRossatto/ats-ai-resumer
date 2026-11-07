/** Largest resume text sent to Gemini, for both analysis and parsing. */
export const MAX_RESUME_CHARS = 30000;

/** Hard stop for a Gemini call, so a slow answer cannot hold the request open. */
export const GEMINI_TIMEOUT_MS = 30000;

/**
 * Removes <tag> and </tag> (any case, spaces allowed) until none is left, so a
 * forged "<</resume>/resume>" cannot rebuild the delimiter after one pass.
 */
export function stripTag(text: string, tag: string): string {
  const pattern = new RegExp(String.raw`<\s*/?\s*${tag}\s*>`, 'gi');
  let current = text;
  let previous: string;

  do {
    previous = current;
    current = current.replace(pattern, '');
  } while (current !== previous);

  return current;
}

/** Single-line, tag-free text for short values placed inside the prompt. */
export const oneLine = (value: string): string =>
  value.replace(/[<>\r\n]+/g, ' ').trim();
