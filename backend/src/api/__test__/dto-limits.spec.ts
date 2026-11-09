import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { AnalyzeResumeDto } from '@api/dto/resume/analyze-resume.dto';
import { ApplyRewritesDto } from '@api/dto/resume/apply-rewrites.dto';

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

describe('ApplyRewritesDto', () => {
  const ok = { analysisId: 'a1' };

  it('accepts no selection or a valid one', async () => {
    expect(await failing(ApplyRewritesDto, ok)).toEqual([]);
    expect(
      await failing(ApplyRewritesDto, { ...ok, rewriteIndexes: [0, 2] }),
    ).toEqual([]);
  });

  it.each([[[-1]], [[1.5]], [['a']], [[1, 1]], [[...Array(21).keys()]]])(
    'rejects rewriteIndexes %p',
    async (rewriteIndexes) => {
      expect(
        await failing(ApplyRewritesDto, { ...ok, rewriteIndexes }),
      ).toEqual(['rewriteIndexes']);
    },
  );
});
