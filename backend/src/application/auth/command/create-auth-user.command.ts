import { RegisterInput } from '@application/dto/auth-inputs';

export class CreateAuthUserCommand {
  constructor(
    public readonly registerAuthDto: RegisterInput,
    public readonly authId: string,
    public readonly profileId: string,
  ) {}
}
