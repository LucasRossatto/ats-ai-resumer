import { AuthUser } from '@domain/entities/Auth';

export interface IAuthRepository {
  create(user: Partial<AuthUser>): Promise<AuthUser>;
  findById(id: string, withPassword?: boolean): Promise<AuthUser | null>;
  findByEmail(
    email: string,
    includePassword?: boolean,
  ): Promise<AuthUser | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  update(id: string, user: Partial<AuthUser>): Promise<AuthUser>;
  delete(id: string): Promise<void>;
  removeRefreshToken(userId: string): Promise<void>;
  /**
   * Swaps the stored refresh token hash only if the account still holds the
   * hash and the token version the caller read. Answers false when it does not
   * (a logout, a password change or another refresh got there first).
   */
  rotateRefreshToken(
    id: string,
    tokenVersion: number,
    currentHash: string,
    newHash: string,
  ): Promise<boolean>;
}
