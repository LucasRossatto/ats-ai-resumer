import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '@application/auth/jwt.strategy';
import { Role } from '@domain/entities/enums/role.enum';

describe('JwtStrategy.validate', () => {
  const authRepository = { findById: jest.fn() };
  const strategy = new JwtStrategy(authRepository as never);

  const auth = {
    id: 'auth-1',
    email: 'lucas@example.com',
    role: [Role.USER],
    tokenVersion: 2,
  };

  beforeEach(() => jest.clearAllMocks());

  it('accepts a token carrying the current version', async () => {
    authRepository.findById.mockResolvedValue(auth);

    await expect(strategy.validate({ sub: 'auth-1', tv: 2 })).resolves.toEqual({
      id: 'auth-1',
      email: 'lucas@example.com',
      roles: [Role.USER],
    });
  });

  it('refuses a token issued before a logout or password change', async () => {
    authRepository.findById.mockResolvedValue(auth);

    await expect(strategy.validate({ sub: 'auth-1', tv: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token of a deleted or unknown account', async () => {
    authRepository.findById.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'auth-1', tv: 2 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('treats a token without a version, and a record without one, as version 0', async () => {
    authRepository.findById.mockResolvedValue({
      ...auth,
      tokenVersion: undefined,
    });

    await expect(strategy.validate({ sub: 'auth-1' })).resolves.toMatchObject({
      id: 'auth-1',
    });
  });

  it('takes the roles from the record, not from the token', async () => {
    authRepository.findById.mockResolvedValue({ ...auth, role: [Role.USER] });

    const user = await strategy.validate({ sub: 'auth-1', tv: 2 });

    expect(user.roles).toEqual([Role.USER]);
  });
});
