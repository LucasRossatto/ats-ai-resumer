/** Erases every resume, version and analysis of a user. Idempotent. */
export class PurgeUserDataCommand {
  constructor(public readonly userId: string) {}
}
