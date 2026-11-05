import * as dotenv from 'dotenv';
import ms, { type StringValue } from 'ms';

dotenv.config();

// Database Constants
export const DB_PROVIDER = 'DbConnectionToken';
export const PROFILE_MODEL_PROVIDER = 'ProfileModelProvider';
export const AUTH_MODEL_PROVIDER = 'AuthModelProvider';
export const RESUME_MODEL_PROVIDER = 'ResumeModelProvider';
export const RESUME_VERSION_MODEL_PROVIDER = 'ResumeVersionModelProvider';
export const ANALYSIS_MODEL_PROVIDER = 'AnalysisModelProvider';
export const SERVICE = 'DB_MONGO_SERVICE';
export const DATABASE_SERVICE =
  process.env.DATABASE_SERVICE || 'DATABASE_SERVICE';

// Gemini Constants
if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'FATAL ERROR: GEMINI_API_KEY is not defined in environment variables.',
  );
}
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Upload Constants
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = ['application/pdf'];
export const PDF_MAGIC_NUMBER = '%PDF-';

// Application Constants
export const APP_NAME = process.env.APP_NAME || 'clean.architecture';
export const APP_PORT = parseInt(process.env.PORT || '4000', 10);
export const APP_HOST = process.env.APP_HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_BASE_PATH = process.env.API_BASE_PATH || 'api';

// CORS / Frontend Constants (defaults are for local development only)
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const CORS_ORIGINS = (
  process.env.CORS_ORIGINS || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Swagger Constants
export const SWAGGER_SERVER_URLS = (
  process.env.SWAGGER_SERVER_URLS || `http://localhost:${APP_PORT}`
)
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

// MongoDB Constants
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs';
export const MONGO_PORT = parseInt(process.env.MONGO_PORT || '27017', 10);

// JWT Constants
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(
      `FATAL ERROR: ${name} must be defined in environment variables with at least 32 characters.`,
    );
  }
  return value;
}
export const JWT_SECRET = requireSecret('JWT_SECRET');
export const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET');
export const JWT_EXPIRATION_TIME = (process.env.JWT_EXPIRATION_TIME ??
  '3600s') as StringValue;
export const JWT_REFRESH_EXPIRATION_TIME = (process.env
  .JWT_REFRESH_EXPIRATION_TIME ?? '7d') as StringValue;

// Refresh token cookie. Path is the auth controller route so the browser sends
// it only there (API_BASE_PATH + URI version '1' + 'auth').
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = `/${API_BASE_PATH}/v1/auth`;
export const REFRESH_COOKIE_MAX_AGE = ms(JWT_REFRESH_EXPIRATION_TIME);
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;
export const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE ||
  'lax') as (typeof SAME_SITE_VALUES)[number];
if (!SAME_SITE_VALUES.includes(COOKIE_SAMESITE)) {
  throw new Error(
    `FATAL ERROR: COOKIE_SAMESITE must be one of ${SAME_SITE_VALUES.join(', ')}.`,
  );
}

// Google OAuth Constants (Web)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Encryption Constants
if (!process.env.EMAIL_ENCRYPTION_KEY) {
  throw new Error(
    'FATAL ERROR: EMAIL_ENCRYPTION_KEY is not defined in environment variables.',
  );
}
if (!process.env.EMAIL_BLIND_INDEX_SECRET) {
  throw new Error(
    'FATAL ERROR: EMAIL_BLIND_INDEX_SECRET is not defined in environment variables.',
  );
}
export const EMAIL_ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
export const EMAIL_BLIND_INDEX_SECRET = process.env.EMAIL_BLIND_INDEX_SECRET;

// Grafana Constants
export const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
export const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || 'admin';

// Prometheus Constants
export const PROMETHEUS_PORT = parseInt(
  process.env.PROMETHEUS_PORT || '9090',
  10,
);
export const GRAFANA_PORT = parseInt(process.env.GRAFANA_PORT || '3000', 10);
