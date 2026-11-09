import { PurgeUserDataCommand } from '@application/auth/command/purge-user-data.command';
import { ResumeService } from '@application/services/resume.service';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

/**
 * Deleting an account erases the resumes, versions and analyses of that user.
 * It is a command and not an event so the caller can await it: if it fails, the
 * account is not deleted yet and the request can simply be repeated.
 */
@CommandHandler(PurgeUserDataCommand)
export class PurgeUserDataHandler implements ICommandHandler<PurgeUserDataCommand> {
  constructor(private readonly resumeService: ResumeService) {}

  async execute(command: PurgeUserDataCommand): Promise<void> {
    await this.resumeService.purgeUser(command.userId);
  }
}
