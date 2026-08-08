import { Role } from '@domain/entities/enums/role.enum';

/**
 * The authenticated user as the client is allowed to see it: identity and
 * display data only. Deliberately not an `AuthUser`, which carries the password
 * hash, the refresh token hash and the email blind index, none of which may
 * ever leave the server.
 */
export interface CurrentUser {
  id: string;
  email: string;
  /**
   * Lives on the profile, which is created by a saga right after the auth user.
   * Null in the window before that lands, so `/me` answers instead of failing.
   */
  name: string | null;
  roles: Role[];
  createdAt?: Date;
}

/**
 * What login and register hand back. `user` is the same `CurrentUser` that
 * `/auth/me` returns, so the client stores one shape no matter which of the
 * three calls produced it.
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: CurrentUser;
}

export class AuthUser {
  readonly id: string;
  email: string;
  password: string;
  googleId?: string;
  role: Role[];
  currentHashedRefreshToken?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
