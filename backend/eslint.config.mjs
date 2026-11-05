import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'max-len': [
        'error',
        { code: 100, ignoreComments: true, ignoreStrings: true },
      ],
      'no-console': 'off',
      'max-classes-per-file': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  // Layer boundaries: dependencies point inward (api -> application -> domain).
  layer('src/domain/**/*.ts', [
    '@application/*',
    '@infrastructure/*',
    '@api/*',
  ]),
  layer('src/application/**/*.ts', ['@api/*']),
  layer('src/infrastructure/**/*.ts', ['@api/*']),
  // TODO(layering): known violations still importing from @api. Move the DTO
  // types into the domain, then delete this override.
  {
    files: [
      'src/application/auth/command/create-auth-user.command.ts',
      'src/application/services/auth.service.ts',
      'src/application/services/profile.service.ts',
      'src/application/services/response.service.ts',
      'src/infrastructure/swagger/swagger-configurator.service.ts',
      // Misplaced: tests application/infrastructure code from the domain folder.
      'src/domain/__test__/profile.service.spec.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
];

function layer(files, patterns) {
  return {
    files: [files],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: patterns.map((group) => ({
            group: [group],
            message: 'Forbidden import across architecture layers.',
          })),
        },
      ],
    },
  };
}
