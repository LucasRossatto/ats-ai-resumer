import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { CreateAuthUserHandler } from '@application/auth/command/handler/create-auth-user.handler';
import { ConflictException } from '@nestjs/common';

describe('CreateAuthUserHandler logging', () => {
  const email = 'pii.person@example.com';
  const input = { name: 'Ann', email, password: 'secret-pass-123' };
  const command = new CreateAuthUserCommand(input, 'auth-1', 'profile-1');

  const build = (existing: unknown) => {
    const logger = { logger: jest.fn(), warning: jest.fn(), err: jest.fn() };
    const handler = new CreateAuthUserHandler(
      {
        findByEmail: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(undefined),
      } as any,
      { publish: jest.fn() } as any,
      logger as any,
      {
        validateUserCreation: jest.fn(),
        canCreateUser: (user: unknown) => !user,
      } as any,
    );
    return { handler, logger };
  };

  const logged = (logger: Record<string, jest.Mock>) =>
    JSON.stringify(Object.values(logger).flatMap((fn) => fn.mock.calls));

  it('never logs the e-mail on a successful registration', async () => {
    const { handler, logger } = build(null);
    await handler.execute(command);
    expect(logger.logger).toHaveBeenCalled();
    expect(logged(logger)).not.toContain(email);
  });

  it('never logs the e-mail when the account already exists', async () => {
    const { handler, logger } = build({ id: 'x' });
    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(logger.warning).toHaveBeenCalled();
    expect(logged(logger)).not.toContain(email);
  });
});
