# Spec de correção: achados da auditoria

Data: 2026-11-04
Origem: auditoria técnica e de portfólio do projeto Destrava Currículo.
Objetivo: deixar o repositório apresentável a recrutadores e remover os riscos de segurança e confiabilidade encontrados.

## Como ler esta spec

- Dois módulos independentes: **Módulo A (backend)** e **Módulo B (frontend)**. Cada um pode ser executado em um branch próprio.
- Há um bloco **Transversal** (README raiz, CI, deploy) que depende dos dois módulos.
- Cada item tem: o quê, onde, critério de aceite e esforço.
- Itens marcados **[verificar]** não foram confirmados na auditoria. O primeiro passo deles é reproduzir o problema.
- Ordem de execução recomendada: A1, A2, A3, T1, A4, B1, B2, T2, T3, demais.

## Fora de escopo

Event Sourcing real, microserviços, Kubernetes, Terraform. Remover a menção a "Event Sourcing" dos textos em vez de implementar.

---

# Módulo A: Backend (`backend/`)

## A1. Segredos JWT sem valor padrão (crítico)

- **Problema:** `src/constants.ts` usa `JWT_SECRET || 'your-default-secret'` e `JWT_REFRESH_SECRET || 'your-default-refresh-secret'`. Sem a variável, o app sobe com segredo público e tokens forjáveis.
- **Mudança:** seguir o padrão já usado em `GEMINI_API_KEY` e `EMAIL_ENCRYPTION_KEY`: lançar erro no boot se faltar. Exigir tamanho mínimo (32 caracteres). Remover o fallback também de `NODE_ENV=test` ou definir os segredos em `test/setup-e2e.ts` e no setup do jest.
- **Aceite:**
  - Subir sem `JWT_SECRET` falha com mensagem clara.
  - `pnpm test` e `pnpm test:e2e` continuam passando.
  - Teste em `src/__test__/constants.spec.ts` cobre a falha.
- **Esforço:** 1 h.

## A2. Testes quebrados (crítico)

- **Problema:** 21 testes falham em 3 de 23 suítes. Um deles é `src/infrastructure/__test__/profile.repository.spec.ts` (`AuthModelProvider` não resolvido no módulo de teste). Os outros 2 suítes: **[verificar]**, rodar `pnpm jest 2>&1 | grep FAIL`.
- **Mudança:** registrar o provider ausente no `Test.createTestingModule`, corrigir os demais, sem enfraquecer asserts.
- **Aceite:** `pnpm test` 100% verde com env de teste fixo; `pnpm test:cov` gera relatório e o percentual é registrado no README.
- **Esforço:** 2 a 3 h.

## A3. CORS, headers e cookie do OAuth (crítico)

- **Problema:**
  - Não há `enableCors`, mas o front em produção fica em outro host.
  - Não há `helmet`.
  - `oauth_state` usa `secure: true`, o que quebra em HTTP local.
  - `GET /auth/google/redirect` devolve JSON em vez de redirecionar ao front **[verificar** se o front consome isso].
- **Mudança:**
  - `app.enableCors({ origin: CORS_ORIGINS (lista por env), credentials: true })`.
  - `app.use(helmet())` (adicionar dependência).
  - `secure: NODE_ENV === 'production'` no cookie.
  - Callback do Google redireciona para `FRONTEND_URL/auth/callback` com os tokens num fragmento (`#`) ou via cookie `httpOnly`, conforme decisão B3.
  - Novas variáveis em `.env.example`: `CORS_ORIGINS`, `FRONTEND_URL`.
- **Aceite:** requisição do front em outro origin funciona; origin não listado é bloqueado; login Google completa no navegador.
- **Esforço:** 3 h.

## A4. Dockerfile e compose de produção

- **Problema:** estágio único, roda como root, devDependencies na imagem final; `mongo:latest` sem autenticação e com porta publicada; Grafana `admin/admin` no `.env.example`.
- **Mudança:**
  - Dockerfile multi-stage (build e runtime), `pnpm install --prod` no runtime, `USER node`, `HEALTHCHECK` em `/health`.
  - Fixar `mongo:<versão>`, `prom/prometheus`, `grafana/grafana` por tag.
  - Mongo com `MONGO_INITDB_ROOT_USERNAME/PASSWORD` e sem `ports` no compose de produção.
  - `GRAFANA_PASSWORD` sem valor padrão no exemplo.
- **Aceite:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up` sobe; `docker exec api whoami` retorna `node`; a imagem final é menor que a atual.
- **Esforço:** 2 h.

## A5. Violações de camada

- **Problema:** `infrastructure/ai/analysis-generator.service.ts` e `application/services/analysis.service.ts` importam `AnalysisLanguage` de `@api/dto/...`. Infraestrutura e aplicação dependem da camada de API.
- **Mudança:** mover `AnalysisLanguage` para `src/domain/entities/` e fazer o DTO importar do domínio. Corrigir demais imports `infrastructure -> application` que sejam evitáveis (**[verificar]** com grep). Adicionar regra ESLint `no-restricted-imports` por camada.
- **Aceite:** `pnpm lint` falha se `domain` importar de qualquer camada externa ou se `infrastructure`/`application` importar de `@api`.
- **Esforço:** 3 h.

## A6. Cota de custo da IA

- **Problema:** o throttler é em memória e por IP (5 análises por minuto). Não há limite por usuário nem por dia, e cada análise gasta chamada ao Gemini.
- **Mudança:** limite diário por usuário (contagem de `Analysis` do dia no repositório, configurável por `ANALYSIS_DAILY_LIMIT`). Resposta 429 com mensagem traduzível.
- **Aceite:** teste unitário em `analysis.service.spec` cobre limite atingido e reset no dia seguinte.
- **Esforço:** 3 h.

## A7. Higiene de logs e prompt

- **Problema:**
  - `auth.service.ts` registra `Token refreshed for user ${auth.email}` **[verificar** se o e-mail está decifrado ali; se sim, é PII em log].
  - O texto do currículo entra cru no prompt, sem delimitação defensiva.
- **Mudança:**
  - Logar apenas o id do usuário.
  - No prompt, envolver o texto em delimitadores explícitos e instruir o modelo a tratá-lo como dado, não como instrução. Truncar a um limite de caracteres.
- **Aceite:** busca por `.email` em chamadas de logger não retorna ocorrências; teste do `buildPrompt` confere delimitadores e truncamento.
- **Esforço:** 2 h.

## A8. Limpeza

- Renomear `application/middlewere` para `middleware` e ajustar imports.
- Remover `moment` e `lodash` se o uso for trivial **[verificar]**.
- Tipar os coercers `any` do `analysis-generator.service.ts` com `unknown` e type guards.
- **Aceite:** `pnpm lint` e `pnpm build` verdes.
- **Esforço:** 2 h.

## A9. Eval do LLM (diferencial)

- **Objetivo:** responder "como você sabe que o score é confiável?".
- **Mudança:** script `backend/scripts/eval-analysis.ts` com 10 currículos fixos (anônimos, em `backend/test/fixtures/`), executa cada um N=5 vezes, reporta média, desvio padrão do `atsScore` e taxa de respostas que passam no `normalize` sem correção. Resultado resumido no README.
- **Aceite:** `pnpm eval` gera tabela em `backend/docs/eval.md`.
- **Esforço:** 4 a 6 h.

---

# Módulo B: Frontend (`frontend/`)

## B1. README do front

- **Problema:** é o README padrão do Vite.
- **Mudança:** substituir por: o que é, stack, variáveis de ambiente (`VITE_API_URL`), como rodar, estrutura de pastas (`api`, `components`, `context`, `hooks`, `pages`, `i18n`, `design-system`), decisões (react-query, i18n pt-BR/en, tema).
- **Aceite:** alguém roda o front só com o README em menos de 5 minutos.
- **Esforço:** 1 h.

## B2. Higiene do repositório

- **Problema:**
  - Dois lockfiles (`package-lock.json` e `pnpm-lock.yaml`).
  - `package.json` com `"version": "0.0.'1"`.
  - `CORRECOES_CODE_REVIEW.md` solto na raiz do front.
  - `brag-output/` e `tsconfig.node.tsbuildinfo` sem estar no `.gitignore` **[verificar** se o tsbuildinfo está rastreado; o `*.tsbuildinfo` já está ignorado].
- **Mudança:**
  - Escolher pnpm (o backend usa pnpm), remover `package-lock.json`.
  - Corrigir a versão para `0.0.1`.
  - Mover o documento de code review para `docs/` ou removê-lo.
  - Adicionar `brag-output/` ao `.gitignore`.
- **Aceite:** `git status` limpo após `pnpm install && pnpm build`; um só lockfile.
- **Esforço:** 30 min.

## B3. Armazenamento de tokens

- **Problema:** `src/api/client.ts` guarda access e refresh token em `localStorage`, expostos a qualquer XSS.
- **Decisão necessária antes de implementar:** (a) manter `localStorage` e documentar o risco aceito no README; ou (b) access token em memória e refresh em cookie `httpOnly`, o que exige mudar o backend (login e refresh passam a definir cookie) e o `AuthContext`.
- **Recomendação:** (b), por ser a resposta forte para a pergunta de entrevista sobre XSS.
- **Mudança em (b):**
  - Backend: login, registro e `refresh-token` definem cookie `httpOnly; Secure; SameSite=Lax`, e o refresh lê do cookie.
  - Frontend: `tokenStore.access` vira variável de módulo; `AuthContext` chama refresh no boot; `axios` com `withCredentials: true`.
  - Depende de A3 (CORS com `credentials`).
- **Aceite:** nenhum token em `localStorage` após login; recarregar a página mantém a sessão; logout limpa o cookie.
- **Esforço:** 6 a 8 h.

## B4. Fluxo do Google OAuth no front

- **Problema:** depende do callback do backend (A3) **[verificar** se há rota `/auth/callback` no `routes.tsx`].
- **Mudança:** criar a página de callback que lê o resultado, grava a sessão conforme B3 e redireciona ao dashboard; tratar erro de `state` inválido com mensagem traduzida em `auth.json` (pt-BR e en).
- **Aceite:** login com Google conclui ponta a ponta em ambiente local e em produção.
- **Esforço:** 2 h.

## B5. Testes do front

- **Problema:** não existe nenhum teste.
- **Mudança:** adicionar Vitest e Testing Library. Cobrir, no mínimo:
  - `client.ts`: refresh único para vários 401 simultâneos e rotas em `NO_REFRESH` que não disparam refresh.
  - `AuthContext`: boot com e sem sessão.
  - `UploadDropzone`: rejeita arquivo que não é PDF.
  - Um fluxo feliz de login com a API mockada.
- **Aceite:** `pnpm test` verde e o script `test` no `package.json`.
- **Esforço:** 6 a 8 h.

## B6. Qualidade e acessibilidade

- Adicionar `pnpm typecheck` (`tsc --noEmit`) ao `package.json`.
- Rodar a skill `web-design-guidelines` ou Lighthouse na landing e no dashboard; registrar as notas de acessibilidade e corrigir as de severidade alta.
- **Aceite:** `typecheck` e `lint` verdes; Lighthouse de acessibilidade ≥ 90 na landing.
- **Esforço:** 3 h.

## B7. Copy em pt-BR

- Revisar `src/i18n/locales/pt-BR/*.json` para garantir que não haja travessão (—) nos textos, conforme a regra do projeto, e que o nome do produto esteja consistente com o rebrand em `docs/superpowers/specs/2026-10-03-rebrand-destrava-curriculo-design.md`.
- **Aceite:** `grep -r "—" src/i18n/locales/pt-BR` não retorna ocorrências.
- **Esforço:** 1 h.

---

# Transversal

## T1. README raiz (crítico)

- **Problema:** não existe README na raiz; o README do backend é de outro projeto (clone URL e mantenedor de terceiros, `users.http` e `aggregates/` inexistentes, "Event Sourcing" não implementado).
- **Mudança:**
  1. Criar `README.md` na raiz: o que é, GIF ou screenshots, link da demo, diagrama de arquitetura, stack, como rodar em 5 minutos, decisões e trade-offs, resultado do eval (A9), cobertura de testes, roadmap.
  2. Reescrever `backend/README.md` descrevendo apenas o que existe (camadas reais, endpoints, variáveis, observabilidade). Remover URL de clone alheia, a seção de mantenedor e os termos não implementados.
  3. Se algum trecho foi derivado do template original, manter atribuição correta e respeitar a licença; manter `LICENSE` coerente.
- **Aceite:** `grep -rn "CollatzConjecture\|Jerry Lucas\|Event Sourcing" .` retorna apenas atribuição intencional (ou nada); um terceiro roda o projeto só pelo README.
- **Esforço:** 4 a 6 h.

## T2. CI (crítico)

- **Mudança:** `.github/workflows/ci.yml` com dois jobs.
  - `backend`: pnpm install, lint, test (com env de teste), build.
  - `frontend`: pnpm install, lint, typecheck, test, build.
  - Cache do pnpm, badges no README raiz.
- **Aceite:** PR com teste quebrado fica vermelho; `main` verde.
- **Esforço:** 2 h.

## T3. Deploy da demo (crítico para divulgação)

- **Mudança:** backend em Fly.io ou Render, MongoDB Atlas (tier gratuito), front na Vercel ou Netlify. Variáveis via secrets da plataforma. `VITE_API_URL`, `CORS_ORIGINS` e `FRONTEND_URL` alinhados. Swagger permanece desligado em produção.
- **Aceite:** URL pública funcionando com cadastro, upload, análise e dashboard; link no README.
- **Esforço:** 1 dia.

## T4. Git

- Renomear o branch `feature/enchance-components` para `feature/enhance-components`.
- PRs por módulo, com commits no padrão convencional já usado.
- **Esforço:** 15 min.

---

# Plano de execução

| Fase | Itens | Esforço total | Resultado |
|---|---|---|---|
| 1. Bloqueadores | A1, A2, A3, T1 | ~11 h | Seguro e honesto para tornar público |
| 2. Confiança | T2, A4, B1, B2 | ~6 h | CI verde e repositório limpo |
| 3. Demo | T3, B4 | ~10 h | Link funcionando para o LinkedIn |
| 4. Nível pleno | A5, A6, A7, B3, B5 | ~25 h | Respostas fortes para entrevista |
| 5. Diferencial | A9, A8, B6, B7 | ~11 h | Case com evidência mensurável |

## Definição de pronto da spec

- [ ] Nenhum default de segredo no código.
- [ ] Backend e frontend com testes verdes no CI.
- [ ] README raiz com demo, arquitetura e instruções verificadas.
- [ ] Nenhuma referência ao repositório ou mantenedor do template no README.
- [ ] Demo pública acessível.
- [ ] Cada item **[verificar]** resolvido: confirmado e corrigido, ou descartado com nota no PR.

---

# Plano de paralelização

Decisão B3 (2026-11-04): **cookie `httpOnly` para o refresh token**. O access token fica em memória no front. B3 e B4 são executados juntos por um único agente na Onda 2, depois do merge de A3.

Cada agente roda em worktree próprio, com branch própria, e é dono exclusivo dos arquivos listados. Merges feitos em sequência, com a suíte completa após cada um.

## Onda 1 (paralela)

| Agente | Itens | Arquivos que possui |
|---|---|---|
| 1 sec-auth | A1, A3, A7 (logs) | `constants.ts`, `main.ts`, `auth.*`, `.env.example`, `setup-e2e.ts`, `constants.spec.ts` |
| 2 tests-ci | A2, T2 (esqueleto) | specs que falham, `.github/workflows/` |
| 3 ai-pipeline | A5, A6, A7 (prompt) | `analysis*`, `domain/entities`, DTO de análise, `eslint.config.mjs` |
| 4 front-hygiene | B2, B1, B6, B7 | raiz do front, README do front, `locales/pt-BR` |
| 5 docs | T1 (rascunho), `backend/README.md` | somente os READMEs |

## Onda 2 (após merge da Onda 1)

| Agente | Itens | Pré-requisito |
|---|---|---|
| 6 tokens | B3 + B4 | A3 mergeado |
| 7 front-tests | B5 | B2 mergeado |
| 8 eval | A9 | A7 mergeado, chave do Gemini rodada pelo usuário |

## Onda 3 (sequencial)

A8 (rename `middlewere`, remover `moment`/`lodash`), T2 final, T3 (deploy, feito pelo usuário), T1 final com números reais, T4.
