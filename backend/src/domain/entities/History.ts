export type HistoryEventType = 'upload' | 'analyze' | 'rewrite';

/**
 * One entry of the activity timeline. The three sources it merges (a resume
 * being created, a version being rewritten, an analysis finishing) collapse
 * into this single shape so the page renders one list instead of three.
 */
export interface HistoryEvent {
  /**
   * Prefixed per source (`r-`, `v-`, `a-`): the ids come from three different
   * collections and would otherwise collide in the list keys.
   */
  id: string;
  type: HistoryEventType;
  title: string;
  subtitle: string;
  /** Short badge on the card: the version name, or the score it reached. */
  label: string;
  at?: Date;
  resumeId: string;
  resumeTitle: string;
}

/**
 * Counts behind the filter tabs. Derived from the events themselves, so a tab
 * can never claim a number the timeline below it does not show.
 */
export interface HistoryTotals {
  all: number;
  upload: number;
  analyze: number;
  rewrite: number;
}

export interface History {
  events: HistoryEvent[];
  totals: HistoryTotals;
}
