import {
  hashRefreshToken,
  refreshTokenMatches,
} from '@application/auth/refresh-token-hash';

// Same JWT header and `{"email":...,"sub":...` prefix (85 bytes > bcrypt's 72):
// only the claims and signature after it differ between two tokens of one user.
const prefix =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNtb2tlQGV4YW1wbGUuY29tIiwic3ViIjoi';
const oldToken = `${prefix}.iat-1000.old-signature`;
const newToken = `${prefix}.iat-2000.new-signature`;

describe('refresh token hash', () => {
  it('shares more than 72 bytes between tokens of the same user (why bcrypt was wrong)', () => {
    expect(prefix.length).toBeGreaterThan(72);
  });

  it('matches the token it was computed from', () => {
    expect(refreshTokenMatches(newToken, hashRefreshToken(newToken))).toBe(
      true,
    );
  });

  it('rejects an older token that only differs after the shared prefix', () => {
    expect(refreshTokenMatches(oldToken, hashRefreshToken(newToken))).toBe(
      false,
    );
  });

  it('rejects a stored value of a different length without throwing', () => {
    expect(refreshTokenMatches(newToken, 'short')).toBe(false);
  });

  it('never stores the token itself', () => {
    expect(hashRefreshToken(newToken)).not.toContain('eyJ');
    expect(hashRefreshToken(newToken)).toMatch(/^[0-9a-f]{64}$/);
  });
});
