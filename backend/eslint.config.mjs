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
