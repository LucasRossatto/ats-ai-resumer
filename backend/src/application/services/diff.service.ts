import { Injectable } from '@nestjs/common';
import {
  ChangeObject,
  diffChars,
  diffLines,
  diffSentences,
  diffWords,
} from 'diff';

export type DiffMode = 'words' | 'chars' | 'lines' | 'sentences';

export interface DiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface DiffSummary {
  added: number;
  removed: number;
}

const DIFFERS: Record<
  DiffMode,
  (a: string, b: string) => ChangeObject<string>[]
> = {
  words: diffWords,
  chars: diffChars,
  lines: diffLines,
  sentences: diffSentences,
};

@Injectable()
export class DiffService {
  diffText(
    oldText: string,
    newText: string,
    mode: DiffMode = 'words',
  ): DiffPart[] {
    const differ = DIFFERS[mode] ?? diffWords;
    const parts = differ(oldText ?? '', newText ?? '');

    return parts.map((p) => ({
      value: p.value,
      added: !!p.added,
      removed: !!p.removed,
    }));
  }

  summarize(parts: DiffPart[]): DiffSummary {
    let added = 0;
    let removed = 0;

    for (const p of parts) {
      if (p.added) {
        added += p.value.length;
      } else if (p.removed) {
        removed += p.value.length;
      }
    }

    return { added, removed };
  }
}
