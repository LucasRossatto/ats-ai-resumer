import { createHash, timingSafeEqual } from 'crypto';

/**
 * Refresh tokens are stored as SHA-256, not bcrypt. bcrypt only reads the first
 * 72 bytes of its input, and every JWT of the same user starts with the same
 * header and `{"email":...,"sub":...` prefix, so `bcrypt.compare(oldToken,
 * hash(newToken))` was `true`: rotation never detected a reused token. A JWT is
 * already high entropy, so a fast hash is the right tool here (bcrypt stays for
 * passwords).
 */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const refreshTokenMatches = (token: string, stored: string): boolean => {
  const a = Buffer.from(hashRefreshToken(token));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
};
