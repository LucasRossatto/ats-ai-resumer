export class CreateProfileCommand {
  constructor(
    public readonly profileId: string,
    public readonly authId: string,
    public readonly name: string,
    /** Absent when the sign-up form did not collect it. */
    public readonly lastname?: string,
    public readonly age?: number,
  ) {}
}
