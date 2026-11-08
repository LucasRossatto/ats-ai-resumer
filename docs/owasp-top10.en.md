# Security and the OWASP Top 10

**English** | [Português](owasp-top10.md)

This document maps the backend to the [OWASP Top 10:2025](https://owasp.org/Top10/2025/) categories: what is already implemented, with the file where you can see it, and what is still missing.

Updated on 2026-11-07, after the security fixes in PRs #32 (login, JWT, dependencies, `/metrics`, `trust proxy`) and #33 (Gemini integration). The public demo runs `main`, which already includes those fixes. Where the text talks about the demo, it says what was checked from the outside and what the repository owner only reported.

**This is a self-assessment, not an audit or a certification.** It was done by reading the code and configuration, with no penetration test. Where a claim could not be verified, it is marked as such. Check the official list at [owasp.org/Top10](https://owasp.org/Top10/2025/).

## Summary

| Category | Status | In one line |
| --- | --- | --- |
| A01 Broken Access Control | Met | Resource owner checked on every resume and account route |
| A02 Security Misconfiguration | Met | Helmet, CORS, Swagger off in production, `/metrics` with a token and `trust proxy` checked on the demo; notes remain for the local compose |
| A03 Software Supply Chain Failures | Partial | Lockfile, production audit, Dependabot, CodeQL and Node 24 in the image; development dependencies are not audited and CI is not required to merge |
| A04 Cryptographic Failures | Partial | bcrypt, SHA-256 and AES-256 in place and JWT pinned to HS256, but AES uses CBC mode |
| A05 Injection | Met | Strict input validation and typed queries |
| A06 Insecure Design | Partial | Quotas and rate limits on every business route, with the quota counting in-flight requests; no global cap and the quota holds per instance |
| A07 Authentication Failures | Partial | Session and refresh handled well and Google requires a verified email; no account lockout or MFA, and account pre-hijacking is still open |
| A08 Software or Data Integrity Failures | Partial | AI output treated as untrusted data and deploys only after CI; no artifact signing |
| A09 Security Logging and Alerting Failures | Partial | Logs without personal data, but no alerts |
| A10 Mishandling of Exceptional Conditions | Met | Global exception filter, no detail leakage |

## A01: Broken Access Control

**What exists**

- **Authentication on protected routes** with `AuthGuard('jwt')`.
- **Resource owner on every resume and analysis route.** The service loads the resume with `findByIdAndUserId(id, userId)` (`loadOwnedResume` in `resume.service.ts` and `analysis.service.ts`). Someone else's resume answers 404, indistinguishable from one that does not exist.
- **Account routes for the owner or an admin only.** `GET /auth/:id` and `DELETE /auth/:id` answer 403 to another user (`auth.service.ts`). The response uses `CurrentUser`, never the entity that carries the password hash and the refresh token hash.
- **A profile is for its owner or an admin only.** `GET /profile/:id` for somebody else answers 404, the same as for an id that does not exist, and there is no route to create a profile from an `authId` (the profile is born at sign-up). Test in `api/__test__/profile.controller.spec.ts`.
- **Access token revocable at once.** On every request `JwtStrategy` checks that the account exists and that the token carries the current `tokenVersion`; logout, a password change and account deletion invalidate tokens already issued, and roles come from the record, not the token (`jwt.strategy.ts`, tested in `jwt.strategy.spec.ts`).
- **Deleting an account erases the data.** The user's resumes, versions (with their text) and analyses are really deleted (`ResumeService.purgeUser`, called before the account is marked as deleted and awaited: if it fails the account stays active and the deletion can be repeated; an account without a profile can also be deleted), and the account lets go of the e-mail, Google id and password hash, which also frees the e-mail for a new sign-up.
- **Roles via `RolesGuard`** on the admin routes of `profile` (`roles.guard.ts`, tested in `__test__/roles.guard.spec.ts`).
- **No SSRF from user input.** The backend only calls fixed addresses (Gemini and Google OAuth).

**Gaps**

- Every authenticated request reads the account record from the database (one `findById` per call). That is the price of revoking the token at once; if it becomes a bottleneck, a short cache solves it.
- `GET /hello` is public on purpose.

## A02: Security Misconfiguration

**What exists**

- **`helmet`** and **CORS restricted** to `CORS_ORIGINS` with credentials (`main.ts`).
- **`ValidationPipe` with `whitelist` and `forbidNonWhitelisted`:** a field not declared in the DTO rejects the request with 400.
- **Swagger only outside production** (`NODE_ENV !== 'production'`).
- **Boot failure** if `JWT_SECRET` or `JWT_REFRESH_SECRET` are shorter than 32 characters, if `EMAIL_ENCRYPTION_KEY` is not exactly 64 hex characters, or if `COOKIE_SAMESITE` is invalid (`constants.ts`).
- **Refresh token cookie** `httpOnly`, `Secure` in production, configurable `SameSite`, and `Path` restricted to `/api/v1/auth`.
- **Docker:** multi-stage image, runs as the `node` user, `HEALTHCHECK`, and pinned tags on third-party images.
- **`/metrics` with an optional token.** With `METRICS_TOKEN` set, the route requires `Authorization: Bearer` and answers 403 without it or with a wrong value; the comparison uses `timingSafeEqual` (`metrics-token.guard.ts`, tested in `metrics-token.guard.spec.ts`). In production without the variable, boot prints a warning.
- **Configurable `trust proxy`** through `TRUST_PROXY` (an integer from 0 to 5, default 0). An invalid value stops the boot (`constants.ts`, tested in `trust-proxy.config.spec.ts`). **On the demo (Vercel and Render) the value is 1, checked on 2026-11-08:** a request through the Vercel domain showed up in the log with the visitor's real IP, and an `X-Forwarded-For` forged by the client was ignored. With a value larger than 1, the forged IP was taken as the client's IP.

**Gaps**

- **`/metrics` is only protected where `METRICS_TOKEN` is set.** On the demo it is: on 2026-11-08 the route answered 403 without credentials (checked by the repository owner, after rebuilding the service on Render). Without the variable, as in local use, the route stays open (see [observability](observability.en.md#known-gaps)).
- **`TRUST_PROXY` has to match the real proxy chain, and the default is 0.** With a value lower than the real one, the IP the rate limiter sees is the proxy's and all users share the same limit. With a larger value, the client forges the IP and escapes the limit. If the hosting changes, repeat the test described in `docs/deploy-gratuito.md`.
- The compose Prometheus sends no token by default. If `METRICS_TOKEN` is set locally, the scrape gets 403 until the `authorization` block of `prometheus.yml` (already there, commented out) is enabled with the token in `prometheus/metrics_token`, a file git ignores.
- The compose file publishes the Prometheus and Grafana ports. On an exposed server, restrict access.

## A03: Software Supply Chain Failures

**What exists**

- `pnpm-lock.yaml` is versioned, with `pnpm install --frozen-lockfile` in the `Dockerfile` and in CI.
- Third-party compose images use pinned tags, and the backend image is on `node:24-alpine` (build and `bcrypt` checked on 2026-11-07).
- **Dependabot** (`.github/dependabot.yml`): weekly, grouped updates for npm (backend and frontend), GitHub Actions and Docker, with PRs against `dev`.
- **CodeQL** (`.github/workflows/codeql.yml`) on PRs, pushes and a weekly scan.
- CI runs a dependency audit, lint, tests and build on every PR, each stage as its own job.
- **`pnpm audit --prod --audit-level=high` in CI** (the `backend / audit` stage): a high or critical vulnerability in a production dependency fails the PR. On 2026-11-07 the audit reported none. The transitive `multer` is pinned to `>=2.5.0` through `pnpm.overrides`.
- **Deploy only after CI.** The deploy jobs depend on every stage and only run on a push to `main`.
- Dependency build scripts are limited by `onlyBuiltDependencies` (`bcrypt` and `unrs-resolver`).

**Gaps**

- **The audit covers production dependencies only**, and development ones were not assessed.
- **Dependabot and CodeQL were just configured.** The first PRs and alerts only show up after the merge. Dependabot uses the pnpm 10 from `packageManager` and CI uses 9, so the lockfile of one of its PRs may need adjusting.
- The branch protection rule only prevents deletion and force pushes. It does not require green CI or a review before merging.

## A04: Cryptographic Failures

**What exists**

- **Passwords** with bcrypt, cost 10 (`auth.model.ts` and `auth.service.ts`).
- **Refresh token** stored as SHA-256 and compared with `timingSafeEqual` (`refresh-token-hash.ts`). bcrypt does not fit here: it only reads the first 72 bytes, which are identical across tokens of the same user.
- **Email encrypted at rest** with AES-256-CBC and a 64-hex key validated at boot, plus a blind index via HMAC-SHA256 with its own secret, so lookups work without decrypting everything.
- **HTTPS** on the hosting services, and a `Secure` cookie in production.
- **JWT with the algorithm pinned to HS256** on signing and verification (`auth.module.ts`, `jwt.strategy.ts`, `auth.service.ts`). A token with `alg: none` is rejected (test in `security-hardening.spec.ts`).

**Gaps**

- **AES-CBC does not authenticate** the ciphertext. GCM mode, which detects tampering, would be preferable.
- The e-mail `decrypt` returns the text itself when it fails (instead of throwing), there is no key version to rotate the key, and the blind index secret has no minimum length (CI uses a 1-character value).
- JWTs use a symmetric secret, and the access token payload carries the email in readable text (a JWT is signed, not encrypted).

## A05: Injection

**What exists**

- Every body goes through `ValidationPipe` with `class-validator` (`IsEmail`, `IsString`, `MinLength`, etc.), which prevents Mongo operator objects (such as `{ "$ne": null }`) where text is expected.
- Queries are built by Mongoose with typed filters, never by concatenating strings.
- Upload accepts PDF only, with a 5 MB limit and a check of both the type and the `%PDF-` signature (`upload.service.ts`).
- The resume text goes to Gemini between `<resume>` and `</resume>` tags, in both the analysis and the parser. The tags are stripped from the content until none is left (`stripTag`), so not even a nested tag like `<</resume>/resume>` closes the block. The target role also goes between tags, on one line (see the [Gemini integration](gemini-integration.en.md)).
- Links the parser extracts from the resume only keep `http`, `https` and `mailto`.

**Gaps**

- There is no explicit Mongo operator sanitization layer. Protection depends on the DTOs typing every field.
- Prompt injection is a risk specific to LLM systems and is only mitigated, not eliminated.

## A06: Insecure Design

**What exists**

- **Quota that counts in-flight requests** (`quota-reservations.ts`): the slot is reserved synchronously after counting what is already saved, so parallel requests from the same user cannot pass the limit (test in `analysis.service.spec.ts`).
- **Every business route uses `ThrottlerGuard`**, including `Hello` and `Profile`. Only `/health` and `/metrics` are left out, on purpose (test in `throttle-coverage.spec.ts`).
- **AI cost control:** a daily per-user quota (`ANALYSIS_DAILY_LIMIT`, UTC day) and a limit of 5 analyses per minute. Creating a resume and applying a rewrite, which also call Gemini, have the `PARSE_DAILY_LIMIT` quota (default 20 resumes per user per day and 20 rewrites per user per day, across all resumes) and answer 429 when it runs out. The accepted PDF has up to 10 pages (`MAX_PDF_PAGES`), which bounds the extraction cost.
- **Rewrites that do not invent content:** the prompt asks for stronger bullets without inventing numbers, dates or results; a rewrite only swaps text that exists (when the original is not found it is skipped, and when none is found the answer is 400 before Gemini is called); the client can apply only the chosen rewrites (`rewriteIndexes`).
- **Per-route rate limits** with `@nestjs/throttler`: 3 per minute on login, 5 on register and 10 on upload and resume creation.
- **Size and type limits** on upload, and the resume text is cut at 30,000 characters before it goes to Gemini.
- A data model where every query carries the owner.

**Gaps**

- **There is no global analysis cap.** The free Gemini quota is small and shared, so a few users can exhaust it.
- The quota reservation lives in the process memory, so it holds for a single instance. With several instances, a counter in the database would be needed. Attempts that fail at Gemini do not count toward the quota.

## A07: Authentication Failures

**What exists**

- **Session:** the access token lives only in memory on the frontend, and the refresh token is sent in an `httpOnly` cookie.
- **Refresh token rotation on every use, with reuse detection:** presenting an old token answers 401. The swap is one write conditional on the hash and the `tokenVersion` that were read, so two refreshes with the same token, or a refresh racing a logout, cannot both pass (`rotateRefreshToken`, tests in `auth.service.spec.ts`).
- **Login attempt limit** (3 per minute) and the same answer (401 `Invalid credentials`) for an unknown email and a wrong password, with `bcrypt` running in both cases so the timing does not give the account away.
- **Google OAuth with a CSRF `state`** in an `httpOnly` cookie, validated on return.
- Password with a minimum of 8 and a maximum of 128 characters (the cap avoids needless bcrypt cost).
- **Google requires `email_verified: true`.** Without it the API answers 401 and does not touch the account. Calls to Google have a 10 s timeout and do not follow redirects (`auth.service.ts`).

**Gaps**

- **Account pre-hijacking is still open.** Whoever registers someone else's email keeps the password after the victim signs in with Google. The ways out are verifying the email at registration, or erasing the password and revoking the refresh token when Google is linked to an account that already has a password. The decision is pending.

- There is no **account lockout** after repeated failures, and no MFA.
- The password policy is only a minimum length, with no check against leaked passwords.
- Register answers 409 ("An account with this email already exists"), which lets someone discover whether an email is registered (a common trade-off).
- Logout and a password change end the session on every device, because there is a single `tokenVersion` per account.

## A08: Software or Data Integrity Failures

**What exists**

- **Gemini output is treated as untrusted data.** It is forced into a schema, goes through `JSON.parse` and is normalized and clamped to valid ranges before being stored (`normalize` in `analysis-generator.service.ts`), with a cap of 20 items (50 keywords) and 2000 characters per field.
- CI validates every PR before merge, and the deploy only runs on `main` after every stage passes.
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

- **Global exception filter** (`ApiExceptionFilter`): non-HTTP errors become `500` with the message `Internal server error`; the original text and the stack go only to the server log (test in `api-exception.filter.spec.ts`).
- **Violated business rules become 400** through `DomainValidationError`, instead of 500.
- **Gemini failures become 503** with a controlled message, after two attempts with a delay. Every call has a 30 s timeout and an output token limit.
- The resume parser has a **fallback**: if Gemini fails, the upload goes on with empty sections.
- Files that are too large or of the wrong type answer 413 and 400 through a dedicated `multer` filter.
- Tests in `application/__test__/api-exception.filter.spec.ts` and `infrastructure/__test__/analysis-generator.retry.spec.ts`.

**Gaps**

- The health check does not detect a database outage (see [observability](observability.en.md#known-gaps)).
- The Google callback with a missing `code` (for example, the user denies consent) answers a JSON 500 in the browser instead of going back to the frontend with an error.
- An empty required field in the Gemini response breaks the analysis write with a 500, after the paid call and outside the quota.

## Security reviews

Three rounds of code-reading review (2026-11-08), with parallel agents for the backend and for the AI integration, against the OWASP API Security Top 10, the Top 10:2025 and the LLM Top 10:2025. There was no dynamic testing, no pentest and no audit of the development dependencies. "Met" means no known gap, not the absence of flaws: later rounds still found new points in categories already marked that way, and none was critical or high.

Findings still open, besides the gaps above:

- **Accounts and e-mail:** the e-mail is not normalized (case, `+alias`, Unicode), so `Ana@x.com` and `ana@x.com` become different accounts and linking with Google can fail; sign-up answers a 500 in a race (E11000) and reveals whether the e-mail exists. Fixing it requires migrating the `emailHash` values already stored.
- **Rewrite integrity:** the `indexOf` swap has no boundaries (a short fragment matches in the wrong place); text above 30000 characters is silently cut before the reparse; nothing stops an invented number in `rewritten`.
- **Configuration:** `/metrics` is public in production if `METRICS_TOKEN` is missing; CI declares no `permissions`; actions use tags instead of SHAs; the frontend sends no security headers.
- **Account deletion:** the encrypted e-mail and the profile (name, last name, age) stay in the database after deletion, and a resume deleted on its own keeps its text.

## Priorities

1. Normalize the e-mail (with a migration of the `emailHash` values) and treat the sign-up race as a 409.
2. Rewrite integrity: boundaries on the swap, a warning on truncation, validation of numbers and empty fields.
3. Decide on account pre-hijacking.
4. Require `METRICS_TOKEN` in production, `permissions` in CI and headers on the frontend.
5. Review the Dependabot PRs and the CodeQL alerts, and audit the development dependencies.
6. A global analysis cap, account lockout, and replace AES-CBC with AES-GCM.
7. Alerts for 5xx and spikes of 401 and 429.
