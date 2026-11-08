# Backend: Destrava Currículo

**English** | [Português](README.md)

A NestJS API that receives resumes as PDFs, extracts the text, asks Gemini for a structured analysis, and stores resumes, versions and analyses in MongoDB. Product overview in the [root README](../README.en.md).

The structure is inspired by [nestjs-clean-architecture](https://github.com/CollatzConjecture/nestjs-clean-architecture). The domain, the endpoints and the AI integration are specific to this repository.

## Architecture

Clean Architecture in four layers, with dependencies always pointing inward. ESLint (`no-restricted-imports` per layer in `eslint.config.mjs`) prevents `domain` from importing other layers and `application` and `infrastructure` from importing `api`.

```
src/
├── api/              # controllers, DTOs and Swagger (no business logic)
├── application/      # services, CQRS commands, events, sagas, guards, interceptors, filters, middlewares
├── domain/           # entities, pure domain services, repository interfaces
└── infrastructure/   # Mongo (models, repositories), Gemini, PDF extraction, health, metrics, logger
```

- Repositories are interfaces in `domain/interfaces` with implementations in `infrastructure/repository`, wired together by a string token.
- CQRS (`@nestjs/cqrs`) and sagas are used in the auth and profile flows. **There is no Event Sourcing**: state is written directly to MongoDB.
- Path aliases: `@api`, `@application`, `@domain`, `@infrastructure`, `@constants`. Full rules in [CLAUDE.md](CLAUDE.md) (in Portuguese).

## Endpoints

Prefix `/api`, version `v1` (`/api/v1/...`). Exceptions, outside the prefix: `GET /health` and `GET /metrics`. The full reference is in Swagger.

| Resource | Routes |
| --- | --- |
| auth | `POST register`, `POST login`, `POST logout`, `POST change-password`, `PATCH password`, `PATCH profile`, `POST refresh-token`, `GET google`, `GET google/redirect`, `GET me`, `GET :id`, `DELETE :id` |
| upload | `POST /upload` (extracts the text from a PDF) |
| resumes | `POST /resumes` (a PDF becomes a resume and V1), `GET /resumes`, `GET /resumes/:id`, `GET /resumes/:id/versions/:versionId`, `GET /resumes/:id/diff`, `POST /resumes/:id/rewrite`, `DELETE /resumes/:id` |
| analyses (under resumes) | `POST /resumes/:id/analyze`, `GET /resumes/:id/analyses`, `GET /resumes/:id/versions/:versionId/analysis` |
| dashboard, versions, history, insights | `GET /dashboard`, `GET /versions`, `GET /history`, `GET /insights` |
| profile | `GET /profile/all`, `GET /profile/admins`, `POST /profile`, `GET /profile/:id`, `PUT /profile/me` |
| hello | `GET /hello` |

Examples in [doc/](doc) (`auth.http`, `profile.http`, `common.http`) and in the [Postman collection](postman-collection.json) with its [environment](postman-environment.json).

## Authentication

- Login returns the access token in the body and sets the refresh token in the `refresh_token` cookie (`httpOnly`, path `/{API_BASE_PATH}/v1/auth`). The frontend keeps the access token in memory only.
- `COOKIE_SAMESITE` (default `lax`) accepts `lax`, `strict` or `none`; `none` requires HTTPS. `COOKIE_DOMAIN` is for sharing the cookie across subdomains (for example `.example.com`). On entirely different domains use `none`; the ideal setup is subdomains of the same domain with `lax`.
- CORS allows the origins in `CORS_ORIGINS` with credentials. The Google callback redirects to `${FRONTEND_URL}/auth/callback`.

## Environment variables

Copy `.env.example` to `.env`. The process **does not start** without `JWT_SECRET` and `JWT_REFRESH_SECRET` (at least 32 characters), `GEMINI_API_KEY`, `EMAIL_ENCRYPTION_KEY` and `EMAIL_BLIND_INDEX_SECRET`.

| Variable | Purpose |
| --- | --- |
| `APP_PORT`, `APP_HOST`, `API_BASE_PATH` | port, host and prefix (defaults 4000, `0.0.0.0`, `api`) |
| `MONGODB_URI` | MongoDB connection (in compose the host is `mongodb`) |
| `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` | required in compose; Mongo starts with authentication |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | token secrets (at least 32 characters) |
| `JWT_EXPIRATION_TIME`, `JWT_REFRESH_EXPIRATION_TIME` | lifetimes (`3600s`, `7d`) |
| `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | refresh token cookie |
| `CORS_ORIGINS`, `FRONTEND_URL` | allowed origins and the frontend URL |
| `EMAIL_ENCRYPTION_KEY`, `EMAIL_BLIND_INDEX_SECRET` | email encryption and blind index |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini integration |
| `ANALYSIS_DAILY_LIMIT` | analyses per user per UTC day (default 20) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google login |
| `SWAGGER_SERVER_URLS` | servers listed in Swagger |
| `GRAFANA_PASSWORD` (required in compose), `GRAFANA_USER`, `MONGO_PORT`, `PROMETHEUS_PORT`, `GRAFANA_PORT` | compose |

## Running

```bash
pnpm install
pnpm start:dev      # tsc -w + nodemon; needs a MongoDB reachable at MONGODB_URI
pnpm build && pnpm start:prod
```

### Docker

```bash
pnpm docker:dev     # docker-compose.yml + .dev.yml: api (hot reload), mongo, prometheus, grafana
pnpm docker:prod    # docker-compose.yml + .prod.yml: uses the final image, no hot reload
pnpm docker:logs
pnpm docker:down    # stops and removes volumes
```

- The image is multi-stage, runs as the `node` user, and has a `HEALTHCHECK` on `/health`. Third-party images use pinned tags.
- The Mongo port is only published in the dev override. In production, set `MONGODB_URI` with user, password and `?authSource=admin`.
- Swagger at `/api/docs` is only mounted when `NODE_ENV` is not `production`. Note: the "Swagger documentation available" log line in `main.ts` is printed even in production, but the route does not exist.

## AI analysis

- The Gemini response is forced into a structured schema, then normalized and validated (`structured-parser.service.ts`).
- The resume text goes into the prompt between `<resume>` and `</resume>`, with an instruction to treat it as data only, and is truncated at 30,000 characters.
- Cost control: a per-user daily quota (`ANALYSIS_DAILY_LIMIT`) and per-route throttling (analysis: 5 req/min; upload and resume creation: 10 req/min; global: 100 req/min).
- Only PDFs with selectable text, up to 5 MB, with a check of the `%PDF-` magic number. There is no OCR.

### Score eval

`pnpm eval` calls the analysis several times over the fictional resumes in `test/fixtures/` and measures score stability (mean, standard deviation, correlation with the expected label). Options: `--runs N` (default 5), `--yes` (skips the confirmation) and `--dry-run` (a fake generator, no network). It needs a real `GEMINI_API_KEY` outside `--dry-run`.

**It has run against the real API, but only partially**: one run per resume, cut short by Gemini failures (503 and the free plan's daily quota). [docs/eval.md](docs/eval.md) (in Portuguese) is a template that the script rewrites; there are no published results. When there is a definitive failure, the script does not overwrite that file.

<!-- TODO: eval result -->

## Tests and quality

```bash
pnpm test           # unit (jest, *.spec.ts)
pnpm test:cov       # coverage
pnpm test:e2e       # test/app.e2e-spec.ts
pnpm lint
```

The tests need the required variables (see `.github/workflows/ci.yml` for test values). Measured at this commit: 35 suites, 380 passing tests, coverage of 77.2% (statements), 66.6% (branches), 68.5% (functions) and 76.0% (lines). CI runs a dependency audit, lint, tests and build.

## Observability

- `GET /health` (Terminus) and `GET /metrics` (Prometheus), outside the `/api` prefix.
- The scrape config is in [prometheus/prometheus.yml](prometheus/prometheus.yml) (jobs `prometheus` and `nestjs`); Grafana is provisioned in [grafana/](grafana).
- Request id (`request-id.middleware.ts`) and a request log on the authentication and profile routes.

## Security

bcrypt for passwords; the refresh token in an `httpOnly` cookie, stored as SHA-256 and rotated on every use (bcrypt is unsuitable for JWTs, since it only reads the first 72 bytes, which are identical across tokens of the same user); Google OAuth2 with `state` in a cookie; email encrypted (AES-256-CBC) with a blind index; `helmet`; a `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`; rate limiting with `@nestjs/throttler`; upload validation; and a daily analysis quota.

## License

[Unlicense](LICENSE), public domain.
