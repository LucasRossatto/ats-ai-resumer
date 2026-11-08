import { AuthUserDeletedEvent } from '@application/auth/events/auth-user-deleted.event';
import { LoggerService } from '@application/services/logger.service';
import { ResumeService } from '@application/services/resume.service';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

/**
 * Deleting an account erases the resumes, versions and analyses of that user.
 * The auth side only soft-deletes the account and publishes this event, so the
 * resume data is erased here, in the module that owns it.
 */
@EventsHandler(AuthUserDeletedEvent)
export class PurgeUserDataHandler implements IEventHandler<AuthUserDeletedEvent> {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly logger: LoggerService,
  ) {}

  async handle(event: AuthUserDeletedEvent): Promise<void> {
    try {
      await this.resumeService.purgeUser(event.authId);
    } catch (error) {
      this.logger.err(
        `Could not erase the data of user ${event.authId}: ${
          error instanceof Error ? error.message : error
        }`,
        { module: 'PurgeUserDataHandler', method: 'handle' },
      );
    }
  }
}
