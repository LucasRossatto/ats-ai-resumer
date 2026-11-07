import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JwtStrategy } from '@application/auth/jwt.strategy';
import { LoginAuthDto } from '@api/dto/auth/login-auth.dto';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { ChangePasswordDto } from '@api/dto/auth/change-password.dto';
import { UpdatePasswordDto } from '@api/dto/auth/update-password.dto';

const long = 'a'.repeat(129);
const ok = 'a'.repeat(128);

async function errorsFor(cls: any, data: object) {
  const errors = await validate(plainToInstance(cls, data));
  return errors.flatMap((e) => Object.keys(e.constraints ?? {}));
}

describe('password length limit', () => {
  it.each([
    [
      LoginAuthDto,
      { email: 'a@b.com', password: long },
      { email: 'a@b.com', password: ok },
    ],
    [
      RegisterAuthDto,
      { name: 'Lucas', email: 'a@b.com', password: long },
      { name: 'Lucas', email: 'a@b.com', password: ok },
    ],
    [
      ChangePasswordDto,
      { oldPassword: 'x', newPassword: long },
      { oldPassword: 'x', newPassword: ok },
    ],
    [
      UpdatePasswordDto,
      { currentPassword: 'x', newPassword: long },
      { currentPassword: 'x', newPassword: ok },
    ],
  ])('%p rejects 129 chars and accepts 128', async (cls, bad, good) => {
    expect(await errorsFor(cls, bad)).toContain('maxLength');
    expect(await errorsFor(cls, good)).not.toContain('maxLength');
  });
});

describe('JWT algorithm pinning', () => {
  it('JwtStrategy only accepts HS256', () => {
    const strategy: any = new JwtStrategy();
    expect(strategy._verifOpts.algorithms).toEqual(['HS256']);
  });

  it('rejects an unsigned (alg none) token', () => {
    const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
      'base64url',
    );
    const body = Buffer.from('{"sub":"1","roles":["admin"]}').toString(
      'base64url',
    );
    const jwt = new JwtService({});
    expect(() =>
      jwt.verify(`${header}.${body}.`, {
        secret: 's'.repeat(32),
        algorithms: ['HS256'],
      }),
    ).toThrow();
  });
});
