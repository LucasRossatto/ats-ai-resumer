# Destrava Currículo

<!-- TODO: badge de CI quando o repo remoto estiver definido -->

Análise de currículo em PDF com IA (Google Gemini), em português do Brasil e em inglês. Você envia o PDF e recebe um score, problemas apontados, pontos fortes, palavras-chave presentes e ausentes e sugestões de reescrita de bullets. Depois aplica as reescritas, gera uma nova versão e compara com a anterior.

Para quem: quem ajusta o currículo para vagas e quer ver, versão a versão, o que mudou e se a avaliação melhorou.

## Demo

<!-- TODO: link da demo e GIF -->

Ainda não há demo pública.

## Diferencial

- **Versionamento com diff**: cada currículo tem versões (V1, V2...) e a API compara o texto de duas versões (`GET /api/v1/resumes/:id/diff`).
- **Aplicar reescritas**: as reescritas de bullets sugeridas em uma análise viram uma nova versão (`POST /api/v1/resumes/:id/rewrite`).
- **Evolução do score**: o dashboard mostra a série de scores das versões e a variação desde a primeira.

## Arquitetura

Monorepo com dois projetos independentes, `backend/` (NestJS) e `frontend/` (React + Vite), ambos com pnpm e sem workspace na raiz.

O backend segue Clean Architecture em quatro camadas, com dependência sempre para dentro. Uma regra do ESLint (`no-restricted-imports` por camada) quebra o lint se `domain` importar outra camada, ou se `application` ou `infrastructure` importarem `api`.

```mermaid
flowchart LR
  FE[Frontend React + Vite] -->|HTTP /api/v1| API[api: controllers e DTOs]
  API --> APP[application: services, CQRS, guards]
  APP --> DOM[domain: entidades e interfaces]
  INF[infrastructure: Mongo, Gemini, PDF, health, metrics] --> DOM
  APP --> INF
```

Fluxo principal:

```mermaid
sequenceDiagram
  participant F as Frontend
  participant A as API
  participant G as Gemini
  participant M as MongoDB
  F->>A: POST /resumes (PDF, até 5 MB)
  A->>A: extrai o texto do PDF
  A->>M: salva currículo e V1
  F->>A: POST /resumes/:id/analyze
  A->>G: texto entre tags resume + schema de resposta
  G-->>A: score, issues, strengths, rewrites
  A->>M: salva a análise
  F->>A: POST /resumes/:id/rewrite
  A->>M: salva nova versão
```

Detalhes em [backend/README.md](backend/README.md) e [frontend/README.md](frontend/README.md).

## Stack

- Backend: NestJS 11, TypeScript, MongoDB (Mongoose), `@nestjs/cqrs`, Passport (JWT e Google OAuth), `@google/genai`, Swagger, Jest.
- Frontend: React 19, Vite, Tailwind 4, React Router 7, TanStack Query, Recharts, i18next (pt-BR e en), `@react-pdf/renderer`, Vitest.
- Infra: Docker Compose, Prometheus, Grafana.

## Rodando em 5 minutos

Pré-requisitos: Node 20+, pnpm, Docker e uma chave da API do Gemini.

```bash
# backend
cd backend
cp .env.example .env     # preencha os campos obrigatórios (tabela abaixo)
pnpm install
pnpm docker:dev          # api, mongo, prometheus e grafana; API em http://localhost:4000

# frontend (outro terminal)
cd frontend
pnpm install
pnpm dev                 # http://localhost:5173
```

Sem Docker, rode um MongoDB local, aponte `MONGODB_URI` para ele e use `pnpm start:dev` no backend. No `.env` do backend, `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` e `GRAFANA_PASSWORD` são obrigatórios para o compose subir.

Em desenvolvimento, o proxy do Vite encaminha `/api` para `http://localhost:4000`, então `VITE_API_URL` fica vazio.

### Variáveis essenciais

Lista completa em [backend/.env.example](backend/.env.example) e [frontend/.env.example](frontend/.env.example). O backend não sobe sem:

| Variável | Observação |
| --- | --- |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | mínimo de 32 caracteres (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | chave do Gemini |
| `EMAIL_ENCRYPTION_KEY` | chave de criptografia do e-mail |
| `EMAIL_BLIND_INDEX_SECRET` | segredo do blind index do e-mail |

Opcionais relevantes: `ANALYSIS_DAILY_LIMIT` (padrão 20), `CORS_ORIGINS`, `FRONTEND_URL`, `COOKIE_SAMESITE` (padrão `lax`), `COOKIE_DOMAIN`.

## Segurança implementada

- **Sessão**: o refresh token vai em cookie `refresh_token` `httpOnly`, com path derivado de `API_BASE_PATH` (`/api/v1/auth`). O access token fica só em memória no frontend; nenhum token é guardado em `localStorage`.
- **Senhas** com hash bcrypt. **Refresh tokens** guardados como SHA-256, comparados em tempo constante e rotacionados a cada uso: reapresentar um token antigo devolve 401. E-mail criptografado em repouso (AES-256-CBC, chave de 64 caracteres hexadecimais validada no boot) com blind index para busca.
- **Google OAuth** com cookie `oauth_state` contra CSRF; o backend redireciona para `/auth/callback` no frontend.
- **CORS** restrito a `CORS_ORIGINS`, `helmet` e `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`.
- **Rate limit** global de 100 req/min e limites menores em login, registro, upload, criação de currículo, reescrita e análise (5 req/min na análise).
- **Upload** só PDF, até 5 MB, com checagem de tipo e do magic number `%PDF-`.
- **Custo da IA**: cota diária por usuário (`ANALYSIS_DAILY_LIMIT`, padrão 20, dia civil UTC). O texto do currículo vai ao prompt entre `<resume>` e `</resume>`, com instrução para tratá-lo só como dado, e é cortado em 30.000 caracteres.
- **Docker**: imagem multi-stage, execução com o usuário `node`, `HEALTHCHECK`, tags de imagem fixas. O Mongo sobe com autenticação e, em produção, sem porta publicada (a porta só existe no override de dev).

### Deploy com domínios diferentes

Como o refresh token é cookie, front e API em domínios distintos exigem `COOKIE_SAMESITE=none`, que só funciona com HTTPS (o cookie sai com `Secure`). O caminho recomendado é usar subdomínios do mesmo domínio (por exemplo `app.exemplo.com` e `api.exemplo.com`), com `COOKIE_DOMAIN=.exemplo.com` e `COOKIE_SAMESITE=lax`. Ajuste também `CORS_ORIGINS`, `FRONTEND_URL` e `VITE_API_URL`.

## Observabilidade

- `GET /health` (Terminus) e `GET /metrics` (Prometheus), ambos fora do prefixo `/api`.
- Prometheus em `:9090` e Grafana em `:3000` (portas e credenciais no `.env`).
- Um request id por requisição, presente nos logs.
- Swagger em `/api/docs` só quando `NODE_ENV` não é `production`.

## Qualidade

- Medido neste commit: backend com 29 suítes e 337 testes passando, cobertura de 74,1% das statements, 55,7% dos branches, 63,0% das funções e 72,8% das linhas (`pnpm test:cov`). Frontend com 14 arquivos e 68 testes passando (`pnpm test`).
- CI em [.github/workflows/ci.yml](.github/workflows/ci.yml): o backend roda lint, testes e build; o frontend roda lint, typecheck, testes e build.
- **Eval do score**: existe um script (`pnpm eval` no backend, com `--dry-run`, `--runs N` e `--yes`) que mede a estabilidade do score do LLM sobre currículos fictícios. **Ainda não foi executado com a API real**, então não há resultado publicado; [backend/docs/eval.md](backend/docs/eval.md) é só o modelo do relatório.
  <!-- TODO: resultado do eval -->

## Decisões e trade-offs

- **O score é opinião do LLM, não uma medição de ATS real.** Nenhum ATS é consultado. Use o score para comparar versões entre si, não como garantia de aprovação.
- A resposta do Gemini é forçada a um schema estruturado e validada depois, o que reduz respostas malformadas mas não elimina a variação entre execuções (por isso o eval).
- CQRS e sagas existem nos fluxos de auth e profile; o resto usa services de aplicação diretos. Não há Event Sourcing.
- Access token só em memória troca persistência por segurança: ao recarregar a página, a sessão é restaurada pelo cookie de refresh.
- O `strict` do TypeScript no frontend está desligado por enquanto.

## Limitações

- Sem OCR: só PDF com texto selecionável, PDF escaneado não funciona.
- O botão de login com Google está em `Login.tsx` e `Register.tsx` e o fluxo existe no backend, mas ainda não foi exercitado de ponta a ponta com credenciais OAuth reais.
- Sem demo pública e sem resultado de eval publicado.

## Roadmap

- Rodar o eval com a API real e publicar os números.
- Validar o login com Google com credenciais OAuth reais.
- OCR para PDFs escaneados.
- Demo pública.

## Licença

Backend sob [Unlicense](backend/LICENSE). Crédito ao template de origem em [backend/README.md](backend/README.md).
