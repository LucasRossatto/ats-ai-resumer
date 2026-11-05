import {
  COOKIE_DOMAIN,
  COOKIE_SAMESITE,
  NODE_ENV,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from '@constants';
import { CookieOptions, Response } from 'express';

/**
 * CSRF note: the refresh endpoint authenticates by cookie, so it relies on
 * SameSite (Lax by default), being POST-only and CORS limited to CORS_ORIGINS.
 * `path` and `domain` must match between set and clear, or the browser keeps it.
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  // Browsers reject SameSite=None without Secure.
  secure: NODE_ENV === 'production' || COOKIE_SAMESITE === 'none',
  sameSite: COOKIE_SAMESITE,
  path: REFRESH_COOKIE_PATH,
  domain: COOKIE_DOMAIN,
};

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

export const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
