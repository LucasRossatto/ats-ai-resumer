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
