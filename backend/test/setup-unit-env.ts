// Segredos exigidos no boot por src/constants.ts (minimo 32 caracteres).
process.env.JWT_SECRET ||= 'test-jwt-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET ||= 'test-jwt-refresh-secret-at-least-32-chars';

// AES-256 precisa de 32 bytes: 64 caracteres hexadecimais.
process.env.EMAIL_ENCRYPTION_KEY ||=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
