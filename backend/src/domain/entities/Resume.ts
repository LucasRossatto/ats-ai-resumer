export class Resume {
  readonly id: string;
  readonly userId: string;
  title: string;
  currentVersionId?: string | null;
  latestVersionNumber: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * A resume as the list draws it: the card fields plus the best result it ever
 * reached. Never carries its versions or their text, the detail route does.
 */
export interface ResumeListItem {
  id: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  currentVersionId?: string | null;
  /**
   * Doubles as the version count while no version can be deleted: numbering is
   * dense, so the latest number is how many there are.
   */
  latestVersionNumber: number;
  /**
   * Null when the resume was never analyzed. Zero would read as a bad score
   * instead of an absent one, the same rule `VersionListItem.score` follows.
   */
  bestScore: number | null;
}
