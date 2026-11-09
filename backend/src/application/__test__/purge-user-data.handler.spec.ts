import { PurgeUserDataCommand } from '@application/auth/command/purge-user-data.command';
import { PurgeUserDataHandler } from '@application/resume/purge-user-data.handler';

describe('PurgeUserDataHandler', () => {
  const resumeService = { purgeUser: jest.fn() };
  const handler = new PurgeUserDataHandler(resumeService as never);

  beforeEach(() => jest.clearAllMocks());

  it('erases the data of the user', async () => {
    resumeService.purgeUser.mockResolvedValue(undefined);

    await handler.execute(new PurgeUserDataCommand('auth-1'));

    expect(resumeService.purgeUser).toHaveBeenCalledWith('auth-1');
  });

  it('lets a failure reach the caller, so the deletion can be repeated', async () => {
    resumeService.purgeUser.mockRejectedValue(new Error('mongo down'));

    await expect(
      handler.execute(new PurgeUserDataCommand('auth-1')),
    ).rejects.toThrow('mongo down');
  });
});
