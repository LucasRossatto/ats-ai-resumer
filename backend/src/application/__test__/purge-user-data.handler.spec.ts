import { AuthUserDeletedEvent } from '@application/auth/events/auth-user-deleted.event';
import { PurgeUserDataHandler } from '@application/resume/purge-user-data.handler';

describe('PurgeUserDataHandler', () => {
  const resumeService = { purgeUser: jest.fn() };
  const logger = { err: jest.fn() };
  const handler = new PurgeUserDataHandler(
    resumeService as never,
    logger as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('erases the data of the deleted account', async () => {
    resumeService.purgeUser.mockResolvedValue(undefined);

    await handler.handle(new AuthUserDeletedEvent('auth-1', 'profile-1'));

    expect(resumeService.purgeUser).toHaveBeenCalledWith('auth-1');
  });

  it('logs a failure instead of throwing into the event bus', async () => {
    resumeService.purgeUser.mockRejectedValue(new Error('mongo down'));

    await expect(
      handler.handle(new AuthUserDeletedEvent('auth-1', 'profile-1')),
    ).resolves.toBeUndefined();
    expect(logger.err).toHaveBeenCalledWith(
      expect.stringContaining('mongo down'),
      expect.any(Object),
    );
  });
});
