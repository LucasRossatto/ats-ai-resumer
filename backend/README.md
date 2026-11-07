# Backend: Destrava Currículo

[English](README.en.md) | **Português**

API NestJS que recebe currículos em PDF, extrai o texto, pede uma análise estruturada ao Gemini e guarda currículos, versões e análises no MongoDB. Visão geral do produto no [README da raiz](../README.md).

Estrutura inspirada em [nestjs-clean-architecture](https://github.com/CollatzConjecture/nestjs-clean-architecture). O domínio, os endpoints e a integração com IA são deste repositório.

## Arquitetura

Clean Architecture em quatro camadas, com dependência sempre para dentro. O ESLint (`no-restricted-imports` por camada em `eslint.config.mjs`) impede `domain` de importar outras camadas e `application` e `infrastructure` de importarem `api`.

```
src/
├── api/              # controllers, DTOs e Swagger (sem regra de negócio)
├── application/      # services, comandos CQRS, eventos, sagas, guards, interceptors, filtros, middlewares
├── domain/           # entidades, domain services puros, interfaces de repositório
└── infrastructure/   # Mongo (models, repositories), Gemini, extração de PDF, health, metrics, logger
```

- Repositórios são interfaces em `domain/interfaces` e implementações em `infrastructure/repository`, ligadas por token string.
- CQRS (`@nestjs/cqrs`) e sagas são usados nos fluxos de auth e profile. **Não há Event Sourcing**: o estado é gravado diretamente no MongoDB.
- Aliases de path: `@api`, `@application`, `@domain`, `@infrastructure`, `@constants`. Regras completas em [CLAUDE.md](CLAUDE.md).

## Endpoints

Prefixo `/api`, versão `v1` (`/api/v1/...`). Exceções, fora do prefixo: `GET /health` e `GET /metrics`. A referência completa está no Swagger.

| Recurso | Rotas |
| --- | --- |
| auth | `POST register`, `POST login`, `POST logout`, `POST change-password`, `PATCH password`, `PATCH profile`, `POST refresh-token`, `GET google`, `GET google/redirect`, `GET me`, `GET :id`, `DELETE :id` |
| upload | `POST /upload` (extrai o texto de um PDF) |
| resumes | `POST /resumes` (PDF vira currículo e V1), `GET /resumes`, `GET /resumes/:id`, `GET /resumes/:id/versions/:versionId`, `GET /resumes/:id/diff`, `POST /resumes/:id/rewrite`, `DELETE /resumes/:id` |
| análises (sob resumes) | `POST /resumes/:id/analyze`, `GET /resumes/:id/analyses`, `GET /resumes/:id/versions/:versionId/analysis` |
| dashboard, versions, history, insights | `GET /dashboard`, `GET /versions`, `GET /history`, `GET /insights` |
| profile | `GET /profile/all`, `GET /profile/admins`, `POST /profile`, `GET /profile/:id`, `PUT /profile/me` |
| hello | `GET /hello` |

Exemplos em [doc/](doc) (`auth.http`, `profile.http`, `common.http`) e na [coleção Postman](postman-collection.json) com o [ambiente](postman-environment.json).

## Autenticação

- O login devolve o access token no corpo e define o refresh token no cookie `refresh_token` (`httpOnly`, path `/{API_BASE_PATH}/v1/auth`). O frontend guarda o access token só em memória.
- `COOKIE_SAMESITE` (padrão `lax`) aceita `lax`, `strict` ou `none`; `none` exige HTTPS. `COOKIE_DOMAIN` serve para compartilhar o cookie entre subdomínios (ex.: `.exemplo.com`). Em domínios totalmente diferentes use `none`; o ideal é subdomínios do mesmo domínio com `lax`.
- CORS permite as origens de `CORS_ORIGINS` com credenciais. O callback do Google redireciona para `${FRONTEND_URL}/auth/callback`.

## Variáveis de ambiente

Copie `.env.example` para `.env`. O processo **não inicia** sem `JWT_SECRET` e `JWT_REFRESH_SECRET` (mínimo de 32 caracteres), `GEMINI_API_KEY`, `EMAIL_ENCRYPTION_KEY` e `EMAIL_BLIND_INDEX_SECRET`.

| Variável | Uso |
| --- | --- |
| `APP_PORT`, `APP_HOST`, `API_BASE_PATH` | porta, host e prefixo (padrão 4000, `0.0.0.0`, `api`) |
| `MONGODB_URI` | conexão com o MongoDB (no compose o host é `mongodb`) |
| `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` | obrigatórias no compose; o Mongo sobe com autenticação |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | segredos dos tokens (mín. 32 caracteres) |
| `JWT_EXPIRATION_TIME`, `JWT_REFRESH_EXPIRATION_TIME` | validade (`3600s`, `7d`) |
| `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | cookie do refresh token |
| `CORS_ORIGINS`, `FRONTEND_URL` | origens permitidas e URL do frontend |
| `EMAIL_ENCRYPTION_KEY`, `EMAIL_BLIND_INDEX_SECRET` | criptografia do e-mail e blind index |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | integração com o Gemini |
| `ANALYSIS_DAILY_LIMIT` | análises por usuário por dia UTC (padrão 20) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | login com Google |
| `SWAGGER_SERVER_URLS` | servidores listados no Swagger |
| `GRAFANA_PASSWORD` (obrigatória no compose), `GRAFANA_USER`, `MONGO_PORT`, `PROMETHEUS_PORT`, `GRAFANA_PORT` | compose |

## Como rodar

```bash
pnpm install
pnpm start:dev      # tsc -w + nodemon; precisa de MongoDB acessível em MONGODB_URI
pnpm build && pnpm start:prod
```

### Docker

```bash
pnpm docker:dev     # docker-compose.yml + .dev.yml: api (hot reload), mongo, prometheus, grafana
pnpm docker:prod    # docker-compose.yml + .prod.yml: usa a imagem final, sem hot reload
pnpm docker:logs
pnpm docker:down    # derruba e remove volumes
```

- A imagem é multi-stage, roda como usuário `node` e tem `HEALTHCHECK` em `/health`. As imagens de terceiros usam tags fixas.
- A porta do Mongo só é publicada no override de dev. Em produção, defina `MONGODB_URI` com usuário, senha e `?authSource=admin`.
- Swagger em `/api/docs` só é montado quando `NODE_ENV` não é `production`. Atenção: a linha de log "Swagger documentation available" em `main.ts` é impressa mesmo em produção, mas a rota não existe.

## Análise com IA

- A resposta do Gemini é forçada a um schema estruturado e depois normalizada e validada (`structured-parser.service.ts`).
- O texto do currículo entra no prompt entre `<resume>` e `</resume>`, com instrução para tratá-lo só como dado, e é cortado em 30.000 caracteres.
- Custo: cota diária por usuário (`ANALYSIS_DAILY_LIMIT`) e throttling por rota (análise: 5 req/min; upload e criação de currículo: 10 req/min; global: 100 req/min).
- Só PDF com texto selecionável, até 5 MB, com checagem do magic number `%PDF-`. Não há OCR.

### Eval do score

`pnpm eval` chama a análise várias vezes sobre currículos fictícios de `test/fixtures/` e mede a estabilidade do score (média, desvio padrão, correlação com o rótulo esperado). Opções: `--runs N` (padrão 5), `--yes` (pula a confirmação) e `--dry-run` (gerador falso, sem rede). Precisa de `GEMINI_API_KEY` real fora do `--dry-run`.

**Já rodou com a API real, mas só parcialmente**: uma execução por currículo, interrompida por falhas do Gemini (503 e cota diária do plano gratuito). [docs/eval.md](docs/eval.md) é um modelo que o script reescreve; não há resultados publicados. Quando há falha definitiva, o script não sobrescreve esse arquivo.

<!-- TODO: resultado do eval -->

## Testes e qualidade

```bash
pnpm test           # unitários (jest, *.spec.ts)
pnpm test:cov       # cobertura
pnpm test:e2e       # test/app.e2e-spec.ts
pnpm lint
```

Os testes precisam das variáveis obrigatórias (veja `.github/workflows/ci.yml` para valores de teste). Medido neste commit: 30 suítes, 340 testes passando, cobertura de 75,7% (statements), 59,1% (branches), 65,5% (funções) e 74,5% (linhas). O CI roda lint, testes e build.

## Observabilidade

- `GET /health` (Terminus) e `GET /metrics` (Prometheus), fora do prefixo `/api`.
- O scrape está em [prometheus/prometheus.yml](prometheus/prometheus.yml) (jobs `prometheus` e `nestjs`); Grafana provisionado em [grafana/](grafana).
- Um request id por requisição (`request-id.middleware.ts`), presente nos logs.

## Segurança

bcrypt para senhas; refresh token em cookie `httpOnly`, guardado como SHA-256 e rotacionado a cada uso (o bcrypt não serve para JWT, pois só lê os 72 primeiros bytes, idênticos entre tokens do mesmo usuário); Google OAuth2 com `state` em cookie, e-mail criptografado (AES-256-CBC) com blind index, `helmet`, `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`, rate limit com `@nestjs/throttler`, validação de upload e cota diária de análises.

## Licença

[Unlicense](LICENSE), domínio público.
