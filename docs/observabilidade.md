# Observabilidade

[English](observability.en.md) | **Português**

Este documento descreve o que o backend expõe hoje para quem opera o sistema: logs, métricas, health check, request id e os painéis do Grafana. Tudo aqui foi conferido no código (`backend/src`) e na configuração (`backend/prometheus`, `backend/grafana`, `docker-compose*.yml`). Onde algo falta, está na seção [Lacunas conhecidas](#lacunas-conhecidas).

## Visão geral

| Pilar | O que existe | Onde |
| --- | --- | --- |
| Logs | Logs estruturados com nível, contexto de módulo e método, e log de cada requisição HTTP | `LoggerService`, `LoggerMiddleware` |
| Métricas | Histograma de latência HTTP e as métricas padrão do processo Node | `MetricsModule`, `LoggingInterceptor`, `/metrics` |
| Health | Health check com Terminus | `HealthController`, `/health` |
| Rastreio | Um request id por requisição, devolvido no header `x-request-id` | `RequestIdMiddleware` |
| Painéis | Prometheus e Grafana prontos no Docker Compose, com um dashboard de latência | `backend/prometheus`, `backend/grafana` |

## Logs

Os logs saem pelo `LoggerService`, que estende o `Logger` do Nest. Cada linha é um objeto com:

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

- Três níveis: `INFO`, `WARNING` e `ERROR`.
- Todo log carrega `module` e `method`, e a mensagem descreve um evento de negócio.
- O campo `server` recebe `APP_HOST` (por padrão `0.0.0.0`), então não identifica a máquina.

### Log de requisição HTTP

O `LoggerMiddleware` registra uma linha por requisição, quando a resposta termina, com `method`, `url` (sem query string), `statusCode`, `durationMs`, `requestId`, `clientIp`, `userAgent` e `userId`.

| Situação | Nível |
| --- | --- |
| Status 5xx | `ERROR` |
| Status 4xx ou duração acima de 1 s | `WARNING` |
| Demais | `INFO` |

Ficam de fora `/`, `/health`, `/metrics`, `/favicon.ico` e os métodos `OPTIONS` e `HEAD`.

### O que não vai para o log

- **E-mail, senha e token não são logados.** Os serviços identificam o usuário pelo `id`.
- **Em produção o corpo da requisição nunca é logado.** Fora de produção, em `POST`, `PUT` e `PATCH`, o corpo é logado com os campos cujo nome casa com `pass`, `token`, `auth`, `secret`, `email` ou `code` trocados por `***`, e textos longos cortados em 256 caracteres.

## Request id

O `RequestIdMiddleware` usa o primeiro valor que encontrar entre os headers `x-request-id`, `x-correlation-id` e `x-amzn-trace-id`. Sem nenhum deles, gera um UUID. O valor vai para `req.requestId`, para os logs de requisição e para o header de resposta `x-request-id`, que permite ao cliente citar o id ao reportar um problema.

## Métricas

O endpoint é `GET /metrics`, no formato do Prometheus, **fora do prefixo `/api`**.

**Histograma de latência HTTP:** `http_request_duration_seconds`

- Rótulos: `method`, `route` e `status_code`.
- Buckets, em segundos: 0,05, 0,1, 0,25, 0,5, 1, 2,5, 5 e 10.
- O rótulo `route` usa o caminho do template da rota (por exemplo `/api/v1/auth/me`), então a cardinalidade fica limitada ao número de rotas, e não de ids.
- É gravado pelo `LoggingInterceptor`, que está em todos os controllers.

**Métricas padrão do processo:** o `@willsoto/nestjs-prometheus` expõe as métricas do `prom-client` (`nodejs_*` e `process_*`: CPU, memória, event loop, GC, handles). Em uma conferência na demo, o endpoint devolveu 86 linhas dessas métricas.

### Consultas úteis (PromQL)

```promql
# Latência p95 por rota, nos últimos 5 minutos
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Taxa de erros 5xx por segundo
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))

# Proporção de respostas 4xx e 5xx
sum(rate(http_request_duration_seconds_count{status_code=~"[45].."}[5m]))
  / sum(rate(http_request_duration_seconds_count[5m]))

# Requisições por segundo por rota
sum(rate(http_request_duration_seconds_count[5m])) by (route)
```

## Health check

`GET /health` (Terminus), fora do prefixo `/api`. Resposta 200 quando tudo passa:

```json
{ "data": { "status": "ok", "info": { "google": { "status": "up" }, "memory_heap": { "status": "up" }, "memory_rss": { "status": "up" } } } }
```

Os três checks de `TerminusOptionsService`:

| Check | Critério |
| --- | --- |
| `google` | `pingCheck` em `https://google.com` (teste de saída de rede) |
| `memory_heap` | heap abaixo de 200 MB |
| `memory_rss` | RSS abaixo de 3000 MB |

O endpoint é usado pelo `HEALTHCHECK` do `Dockerfile` (a cada 30 s) e é o caminho de health check configurado no Render.

## Prometheus e Grafana

O `docker compose` (`pnpm docker:dev`) sobe os dois:

- **Prometheus** em `:9090` (`PROMETHEUS_PORT`), com `scrape_interval` de 15 s e dois jobs: `prometheus` e `nestjs` (alvo `nestjs-api:4000`, caminho `/metrics`).
- **Grafana** em `:3000` (`GRAFANA_PORT`), com o Prometheus como fonte de dados padrão. O login exige `GRAFANA_USER` e `GRAFANA_PASSWORD` (obrigatória, o compose não sobe sem ela), e o cadastro de novos usuários está desligado.
- Dashboard provisionado: **NestJS HTTP Latency**, com quatro painéis: percentis P50, P90 e P95 por rota e método, e os mesmos três percentis no total.

Para ver funcionando: suba o compose, gere algum tráfego na API e abra `http://localhost:3000`.

## Na demo (Render e Vercel)

A demo não roda Prometheus nem Grafana. Na prática:

- Os logs ficam no painel do Render, em texto.
- O `/metrics` existe no servidor do Render e pode ser raspado por um Prometheus externo.
- Pelo domínio da Vercel, só as rotas `/api/*` chegam ao backend. `/metrics` e `/health` caem no fallback do frontend, então não são alcançáveis por ali.

## Lacunas conhecidas

Estas lacunas são conhecidas e estão listadas de propósito, para que o documento não prometa mais do que o código entrega.

1. **O `/metrics` é público.** Não há autenticação, e no servidor do Render ele responde a qualquer pessoa. Ele revela as rotas usadas, a contagem de requisições e dados do processo. Em um ambiente real, bloqueie o caminho no proxy ou exija um token.
2. **O request id e o log de requisição cobrem só `AuthController` e `ProfileController`.** O `LoggerMiddleware` e o `RequestIdMiddleware` são aplicados somente a essas rotas (`app.module.ts`). As demais (currículos, análises, dashboard) não recebem `x-request-id` nem o log de requisição. As métricas de latência cobrem todas as rotas.
3. **O request id é aceito do cliente sem validação.** Um valor enviado em `x-request-id` entra nos logs como está, então pode ser usado para poluir a correlação.
4. **O `/health` não verifica o MongoDB.** Ele continuaria respondendo 200 com o banco fora do ar. O `google` check também faz o health depender de um serviço externo: se o `google.com` ficar inacessível, o health falha mesmo com a API saudável.
5. **Só existe uma métrica de negócio implícita (a latência).** Não há métricas de análises geradas, falhas e latência do Gemini, tokens consumidos ou cota usada.
6. **O dashboard só tem painéis de latência.** Faltam taxa de erros, vazão e saturação.
7. **Não há alertas.** Não existe Alertmanager nem regras de alerta no Prometheus.
8. **Logs sem coleta central.** Os logs ficam na saída padrão do contêiner.
9. **O `LoggingInterceptor` também imprime `Execution time...` com `console.log` em toda requisição**, o que duplica a informação em texto solto e foge da regra do projeto de usar só o `LoggerService`.

## Próximos passos sugeridos

Em ordem de retorno: proteger o `/metrics`; trocar o check do `google` por um ping do MongoDB (`MongooseHealthIndicator`); aplicar o `RequestIdMiddleware` a todas as rotas; adicionar métricas do Gemini (contador de chamadas por resultado, histograma de latência e contador de tokens); e um painel de erros mais uma regra de alerta para 5xx.
