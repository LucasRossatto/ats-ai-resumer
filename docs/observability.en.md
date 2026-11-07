# Observability

**English** | [Português](observabilidade.md)

This document describes what the backend exposes today for whoever operates the system: logs, metrics, the health check, the request id and the Grafana dashboards. Everything here was checked against the code (`backend/src`) and the configuration (`backend/prometheus`, `backend/grafana`, `docker-compose*.yml`). Where something is missing, it is listed under [Known gaps](#known-gaps).

## Overview

| Pillar | What exists | Where |
| --- | --- | --- |
| Logs | Structured logs with level, module and method context, plus a log line per HTTP request | `LoggerService`, `LoggerMiddleware` |
| Metrics | An HTTP latency histogram and the default Node process metrics | `MetricsModule`, `LoggingInterceptor`, `/metrics` |
| Health | A Terminus health check | `HealthController`, `/health` |
| Tracing | One request id per request, returned in the `x-request-id` header | `RequestIdMiddleware` |
| Dashboards | Prometheus and Grafana ready in Docker Compose, with a latency dashboard | `backend/prometheus`, `backend/grafana` |

## Logs

Logs go through `LoggerService`, which extends Nest's `Logger`. Each line is an object with:

```json
{
  "server": "0.0.0.0",
  "type": "INFO",
  "timestamp": "2026-11-07T19:39:42.213Z",
  "epochMs": 1794000000000,
  "module": "AnalysisService",
  "method": "analyzeResume",
  "message": "Analysis created - resume: ..., score: 72"
}
```

- Three levels: `INFO`, `WARNING` and `ERROR`.
- Every log carries `module` and `method`, and the message describes a business event.
- The `server` field receives `APP_HOST` (`0.0.0.0` by default), so it does not identify the machine.

### HTTP request log

`LoggerMiddleware` writes one line per request, when the response finishes, with `method`, `url` (no query string), `statusCode`, `durationMs`, `requestId`, `clientIp`, `userAgent` and `userId`.

| Situation | Level |
| --- | --- |
| 5xx status | `ERROR` |
| 4xx status or duration above 1 s | `WARNING` |
| Everything else | `INFO` |

`/`, `/health`, `/metrics`, `/favicon.ico` and the `OPTIONS` and `HEAD` methods are skipped.

### What stays out of the logs

- **Email, password and token are not logged.** Services identify the user by `id`.
- **In production the request body is never logged.** Outside production, on `POST`, `PUT` and `PATCH`, the body is logged with fields whose name matches `pass`, `token`, `auth`, `secret`, `email` or `code` replaced by `***`, and long strings cut at 256 characters.

## Request id

`RequestIdMiddleware` takes the first value it finds among the `x-request-id`, `x-correlation-id` and `x-amzn-trace-id` headers. With none of them, it generates a UUID. The value goes into `req.requestId`, the request logs and the `x-request-id` response header, which lets a client quote the id when reporting a problem.

## Metrics

The endpoint is `GET /metrics`, in Prometheus format, **outside the `/api` prefix**.

**HTTP latency histogram:** `http_request_duration_seconds`

- Labels: `method`, `route` and `status_code`.
- Buckets, in seconds: 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5 and 10.
- The `route` label uses the route template path (for example `/api/v1/auth/me`), so cardinality is bounded by the number of routes, not by ids.
- It is recorded by `LoggingInterceptor`, which is on every controller.

**Default process metrics:** `@willsoto/nestjs-prometheus` exposes the `prom-client` metrics (`nodejs_*` and `process_*`: CPU, memory, event loop, GC, handles). In a check against the demo, the endpoint returned 86 lines of these metrics.

### Useful queries (PromQL)

```promql
# p95 latency per route over the last 5 minutes
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# 5xx errors per second
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))

# Share of 4xx and 5xx responses
sum(rate(http_request_duration_seconds_count{status_code=~"[45].."}[5m]))
  / sum(rate(http_request_duration_seconds_count[5m]))

# Requests per second per route
sum(rate(http_request_duration_seconds_count[5m])) by (route)
```

## Health check

`GET /health` (Terminus), outside the `/api` prefix. It answers 200 when everything passes:

```json
{ "data": { "status": "ok", "info": { "google": { "status": "up" }, "memory_heap": { "status": "up" }, "memory_rss": { "status": "up" } } } }
```

The three checks in `TerminusOptionsService`:

| Check | Criterion |
| --- | --- |
| `google` | `pingCheck` on `https://google.com` (an outbound network test) |
| `memory_heap` | heap below 200 MB |
| `memory_rss` | RSS below 3000 MB |

The endpoint is used by the `Dockerfile` `HEALTHCHECK` (every 30 s) and is the health check path configured on Render.

## Prometheus and Grafana

`docker compose` (`pnpm docker:dev`) starts both:

- **Prometheus** on `:9090` (`PROMETHEUS_PORT`), with a `scrape_interval` of 15 s and two jobs: `prometheus` and `nestjs` (target `nestjs-api:4000`, path `/metrics`).
- **Grafana** on `:3000` (`GRAFANA_PORT`), with Prometheus as the default data source. Login needs `GRAFANA_USER` and `GRAFANA_PASSWORD` (required, the compose stack does not start without it), and sign-up is disabled.
- Provisioned dashboard: **NestJS HTTP Latency**, with four panels: P50, P90 and P95 percentiles per route and method, and the same three percentiles overall.

To see it working: start the compose stack, generate some API traffic and open `http://localhost:3000`.

## On the demo (Render and Vercel)

The demo runs neither Prometheus nor Grafana. In practice:

- Logs live in the Render dashboard, as plain text.
- `/metrics` exists on the Render server and can be scraped by an external Prometheus.
- Through the Vercel domain, only the `/api/*` routes reach the backend. `/metrics` and `/health` fall into the frontend fallback, so they are not reachable that way.

## Known gaps

These gaps are known and listed on purpose, so the document does not promise more than the code delivers.

1. **`/metrics` is public.** There is no authentication, and on the Render server it answers anyone. It reveals the routes in use, request counts and process data. In a real environment, block the path at the proxy or require a token.
2. **The request id and the request log cover only `AuthController` and `ProfileController`.** `LoggerMiddleware` and `RequestIdMiddleware` are applied to those routes only (`app.module.ts`). The others (resumes, analyses, dashboard) get neither `x-request-id` nor the request log. The latency metrics cover every route.
3. **The request id is accepted from the client without validation.** A value sent in `x-request-id` enters the logs as is, so it can be used to pollute correlation.
4. **`/health` does not check MongoDB.** It would keep answering 200 with the database down. The `google` check also makes health depend on an external service: if `google.com` becomes unreachable, health fails even with a healthy API.
5. **The only metric is latency.** There are no metrics for analyses generated, Gemini failures and latency, tokens consumed or quota used.
6. **The dashboard only has latency panels.** Error rate, throughput and saturation are missing.
7. **There are no alerts.** There is no Alertmanager and no alert rules in Prometheus.
8. **No central log collection.** Logs stay on the container's standard output.
9. **`LoggingInterceptor` also prints `Execution time...` with `console.log` on every request**, which duplicates information as loose text and goes against the project rule of using only `LoggerService`.

## Suggested next steps

In order of return: protect `/metrics`; replace the `google` check with a MongoDB ping (`MongooseHealthIndicator`); apply `RequestIdMiddleware` to all routes; add Gemini metrics (a call counter by outcome, a latency histogram and a token counter); and an errors panel plus an alert rule for 5xx.
