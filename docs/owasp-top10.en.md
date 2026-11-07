# Security and the OWASP Top 10

**English** | [Português](owasp-top10.md)

This document maps the backend to the [OWASP Top 10:2025](https://owasp.org/Top10/2025/) categories: what is already implemented, with the file where you can see it, and what is still missing.

**This is a self-assessment, not an audit or a certification.** It was done by reading the code and configuration, with no penetration test. Where a claim could not be verified, it is marked as such. Check the official list at [owasp.org/Top10](https://owasp.org/Top10/2025/).

## Summary

| Category | Status | In one line |
| --- | --- | --- |
| A01 Broken Access Control | Met | Resource owner checked on every resume and account route |
| A02 Security Misconfiguration | Partial | Good base (helmet, CORS, Swagger off in production), but `/metrics` is public |
| A03 Software Supply Chain Failures | Partial | Lockfile and frozen install, but no dependency audit and Node 20 in the image |
| A04 Cryptographic Failures | Partial | bcrypt, SHA-256 and AES-256 in place, but AES uses CBC mode |
| A05 Injection | Met | Strict input validation and typed queries |
| A06 Insecure Design | Partial | Quotas and rate limits exist, but there are gaps in AI cost control |
| A07 Authentication Failures | Partial | Session and refresh handled well, no account lockout or MFA |
| A08 Software or Data Integrity Failures | Partial | AI output treated as untrusted data, no artifact signing |
| A09 Security Logging and Alerting Failures | Partial | Logs without personal data, but no alerts |
| A10 Mishandling of Exceptional Conditions | Met | Global exception filter, no detail leakage |

## A01: Broken Access Control

**What exists**

- **Authentication on protected routes** with `AuthGuard('jwt')`.
- **Resource owner on every resume and analysis route.** The service loads the resume with `findByIdAndUserId(id, userId)` (`loadOwnedResume` in `resume.service.ts` and `analysis.service.ts`). Someone else's resume answers 404, indistinguishable from one that does not exist.
- **Account routes for the owner or an admin only.** `GET /auth/:id` and `DELETE /auth/:id` answer 403 to another user (`auth.service.ts`). The response uses `CurrentUser`, never the entity that carries the password hash and the refresh token hash.
- **Roles via `RolesGuard`** on the admin routes of `profile` (`roles.guard.ts`, tested in `__test__/roles.guard.spec.ts`).
- **No SSRF from user input.** The backend only calls fixed addresses (Gemini and Google OAuth).

**Gaps**

- User roles come from the JWT, so a role change only takes effect after the access token (1 h by default) expires.
- `GET /hello` is public on purpose.

## A02: Security Misconfiguration

**What exists**

- **`helmet`** and **CORS restricted** to `CORS_ORIGINS` with credentials (`main.ts`).
- **`ValidationPipe` with `whitelist` and `forbidNonWhitelisted`:** a field not declared in the DTO rejects the request with 400.
- **Swagger only outside production** (`NODE_ENV !== 'production'`).
- **Boot failure** if `JWT_SECRET` or `JWT_REFRESH_SECRET` are shorter than 32 characters, if `EMAIL_ENCRYPTION_KEY` is not exactly 64 hex characters, or if `COOKIE_SAMESITE` is invalid (`constants.ts`).
- **Refresh token cookie** `httpOnly`, `Secure` in production, configurable `SameSite`, and `Path` restricted to `/api/v1/auth`.
- **Docker:** multi-stage image, runs as the `node` user, `HEALTHCHECK`, and pinned tags on third-party images.

**Gaps**

- **`/metrics` is public** on the Render server (see [observability](observability.en.md#known-gaps)).
- The "Swagger documentation available" log line is printed even in production, although the route does not exist.
- There is no `trust proxy` setting. Behind Render and Vercel, the IP seen by the rate limiter may be the proxy's (**not verified in production**), which would make all users share the same limit.
- The compose file publishes the Prometheus and Grafana ports. On an exposed server, restrict access.

## A03: Software Supply Chain Failures

**What exists**

- `pnpm-lock.yaml` is versioned, with `pnpm install --frozen-lockfile` in the `Dockerfile` and in CI.
- Third-party compose images use pinned tags.
- CI runs lint, tests and build on every PR.

**Gaps**

- **There is no dependency audit** in CI (`pnpm audit`), no Dependabot and no code analysis (CodeQL).
- **The image uses `node:20-alpine`.** According to the Node.js release schedule, line 20 left support in April 2026 (confirm at nodejs.org). CI already runs on Node 24.
- `pnpm` warns that it skipped build scripts of some dependencies; worth reviewing with `pnpm approve-builds`.
- The branch protection rule only prevents deletion and force pushes. It does not require green CI or a review before merging.

## A04: Cryptographic Failures

**What exists**

- **Passwords** with bcrypt, cost 10 (`auth.model.ts` and `auth.service.ts`).
- **Refresh token** stored as SHA-256 and compared with `timingSafeEqual` (`refresh-token-hash.ts`). bcrypt does not fit here: it only reads the first 72 bytes, which are identical across tokens of the same user.
- **Email encrypted at rest** with AES-256-CBC and a 64-hex key validated at boot, plus a blind index via HMAC-SHA256 with its own secret, so lookups work without decrypting everything.
- **HTTPS** on the hosting services, and a `Secure` cookie in production.

**Gaps**

- **AES-CBC does not authenticate** the ciphertext. GCM mode, which detects tampering, would be preferable.
- JWTs are signed with a symmetric secret (HS256) and the access token payload carries the email in readable text (a JWT is signed, not encrypted).

## A05: Injection

**What exists**

- Every body goes through `ValidationPipe` with `class-validator` (`IsEmail`, `IsString`, `MinLength`, etc.), which prevents Mongo operator objects (such as `{ "$ne": null }`) where text is expected.
- Queries are built by Mongoose with typed filters, never by concatenating strings.
- Upload accepts PDF only, with a 5 MB limit and a check of both the type and the `%PDF-` signature (`upload.service.ts`).
- The resume text goes to Gemini between `<resume>` and `</resume>` tags, and the closing tag is stripped from the content (see the [Gemini integration](gemini-integration.en.md)).

**Gaps**

- There is no explicit Mongo operator sanitization layer. Protection depends on the DTOs typing every field.
- Prompt injection is a risk specific to LLM systems and is only mitigated, not eliminated.

## A06: Insecure Design

**What exists**

- **AI cost control:** a daily per-user quota (`ANALYSIS_DAILY_LIMIT`, UTC day) and a limit of 5 analyses per minute.
- **Per-route rate limits** with `@nestjs/throttler`: 3 per minute on login, 5 on register and 10 on upload and resume creation.
- **Size and type limits** on upload, and the resume text is cut at 30,000 characters before it goes to Gemini.
- A data model where every query carries the owner.

**Gaps**

- **There is no global analysis cap.** The free Gemini quota is small and shared, so a few users can exhaust it.
- **Upload and rewrite also call Gemini** (to structure the text), but only analyses count toward `ANALYSIS_DAILY_LIMIT`.
- The quota check and the analysis creation are not atomic: simultaneous requests can slightly exceed the limit.
- `HelloController` and `ProfileController` do not use `ThrottlerGuard`.

## A07: Authentication Failures

**What exists**

- **Session:** the access token lives only in memory on the frontend, and the refresh token is sent in an `httpOnly` cookie.
- **Refresh token rotation on every use, with reuse detection:** presenting an old token answers 401.
- **Login attempt limit** (3 per minute) and a generic message for a wrong password.
- **Google OAuth with a CSRF `state`** in an `httpOnly` cookie, validated on return.
- Password with a minimum of 8 characters.

**Gaps**

- There is no **account lockout** after repeated failures, and no MFA.
- The password policy is only a minimum length, with no check against leaked passwords.
- Register answers 409 ("An account with this email already exists"), which lets someone discover whether an email is registered (a common trade-off).
- A valid access token cannot be revoked before it expires.

## A08: Software or Data Integrity Failures

**What exists**

- **Gemini output is treated as untrusted data.** It is forced into a schema, goes through `JSON.parse` and is normalized and clamped to valid ranges before being stored (`normalize` in `analysis-generator.service.ts`).
- CI validates every PR before merge.
- Installs use a frozen lockfile.

**Gaps**

- Images and build artifacts are not signed, and there is no provenance attestation.
- There is no required review and no required CI on the protected branches.

## A09: Security Logging and Alerting Failures

**What exists**

- Structured logs with level and context, and a log line per HTTP request with status, duration and `requestId` (on the auth and profile routes).
- **No personal data:** email, password and token are not logged, and the request body is never logged in production.
- Failed logins are recorded with the user id.

**Gaps**

- **There are no alerts.** No rule raises a warning on spikes of 401, 429 or 5xx.
- The request log covers only the auth and profile routes (see [observability](observability.en.md#known-gaps)).
- Logs stay on the container's output, with no central collection.

## A10: Mishandling of Exceptional Conditions

**What exists**

- **Global exception filter** (`ApiExceptionFilter`): non-HTTP errors become `500 INTERNAL_ERROR` with a generic message, no stack trace and no internal detail.
- **Violated business rules become 400** through `DomainValidationError`, instead of 500.
- **Gemini failures become 503** with a controlled message, after two attempts with a delay.
- The resume parser has a **fallback**: if Gemini fails, the upload goes on with empty sections.
- Files that are too large or of the wrong type answer 413 and 400 through a dedicated `multer` filter.
- Tests in `application/__test__/api-exception.filter.spec.ts` and `infrastructure/__test__/analysis-generator.retry.spec.ts`.

**Gaps**

- The health check does not detect a database outage (see [observability](observability.en.md#known-gaps)).

## Priorities

1. Protect `/metrics` and configure `trust proxy`.
2. Move the image to a supported Node version and enable Dependabot and `pnpm audit` in CI.
3. A global analysis cap, and count upload and rewrite calls in the quota.
4. Account lockout, and replace AES-CBC with AES-GCM.
5. Alerts for 5xx and spikes of 401 and 429.
