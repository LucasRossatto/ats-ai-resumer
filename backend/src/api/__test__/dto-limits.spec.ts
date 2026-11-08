import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { AnalyzeResumeDto } from '@api/dto/resume/analyze-resume.dto';

const base = {
  name: 'Ana',
  lastname: 'Silva',
  age: 30,
  email: 'ana@example.com',
  password: 'Password123',
};

const failing = async (cls: new () => object, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe('DTO limits', () => {
  it('accepts a regular sign-up', async () => {
    expect(await failing(RegisterAuthDto, base)).toEqual([]);
  });

  it('caps name and lastname at 50 characters', async () => {
    const long = 'a'.repeat(51);
    expect(await failing(RegisterAuthDto, { ...base, name: long })).toEqual([
      'name',
    ]);
    expect(await failing(RegisterAuthDto, { ...base, lastname: long })).toEqual(
      ['lastname'],
    );
  });

  it.each([-1, 151, 1e9, 30.5])('rejects age %p', async (age) => {
    expect(await failing(RegisterAuthDto, { ...base, age })).toEqual(['age']);
  });

  it('caps versionId at 64 characters', async () => {
    expect(
      await failing(AnalyzeResumeDto, { versionId: 'v'.repeat(65) }),
    ).toEqual(['versionId']);
    expect(
      await failing(AnalyzeResumeDto, { versionId: 'v'.repeat(64) }),
    ).toEqual([]);
  });
});
