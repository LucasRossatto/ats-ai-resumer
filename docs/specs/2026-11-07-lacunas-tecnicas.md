# Spec: fechar as lacunas de observabilidade, segurança e custo da IA

Data: 2026-11-07
Origem: seções "Lacunas conhecidas" de `docs/observabilidade.md`, `docs/owasp-top10.md` e `docs/integracao-gemini.md` (PR #30).
Objetivo: cada lacuna documentada vira um item com escopo, critérios de aceite e teste. Ao fechar um item, remover a lacuna correspondente do documento de origem.

## Regras para quem executar

1. Branch a partir de `origin/dev`, PR para `dev`. Um item por branch e por PR. Prefixos: `fix/`, `feat/`, `ci/`, `chore/`.
2. Commits terminam com a linha de atribuição do Claude Code. PRs terminam com "Generated with Claude Code".
3. Textos em português do Brasil, sem travessão, com acentuação completa.
4. Arquivos em CRLF no Windows. Patches preservam isso.
5. Todo item de código traz teste que falha sem a mudança. `pnpm lint`, `pnpm test` e `pnpm build` verdes no backend antes do PR.
6. Mudança em segredo, variável de ambiente ou painel de hospedagem é do dono do repositório. O agente documenta no `.env.example` e no tutorial de deploy.

## Visão geral e ordem

| # | Item | Origem | Esforço | Prioridade |
|---|---|---|---|---|
| S1 | Proteger o `/metrics` | observabilidade 1, OWASP A02 | 1 h | Alta |
| S2 | `trust proxy` para o limitador de taxa | OWASP A02 | 1 h | Alta |
| S3 | Teto global e cota de upload e reescrita | Gemini, OWASP A06 | 2 a 3 h | Alta |
| S4 | Health check com MongoDB, sem Google | observabilidade 4, OWASP A10 | 1 h | Média |
| S5 | Request id e log de requisição em todas as rotas | observabilidade 2 e 3, OWASP A09 | 1 a 2 h | Média |
| S6 | Auditoria de dependências, Dependabot e Node 24 na imagem | OWASP A03 | 1 a 2 h | Média |
| S7 | Métricas do Gemini e painel de erros | observabilidade 5 e 6 | 3 a 4 h | Média |
| S8 | Alertas para 5xx e picos de 401 e 429 | observabilidade 7, OWASP A09 | 2 h | Baixa |
| S9 | Limpezas pequenas | observabilidade 9, OWASP A02 | 30 min | Baixa |
| S10 | AES-GCM, bloqueio de conta, proteção de branch | OWASP A04, A07, A08 | 4 a 6 h | Baixa |

Ordem sugerida: S1, S2, S3 (risco real na demo pública), depois S4, S5, S6, e o resto conforme houver espaço. Os itens são independentes, exceto S8 (depende de S7 para alertar sobre o Gemini).

## Decisões pendentes do dono

| Id | Decisão | Opções | Recomendação |
| --- | --- | --- | --- |
| D1 | Como proteger o `/metrics` | (a) token em header (`METRICS_TOKEN`), (b) só rede interna, (c) desligar na demo | (a): funciona no Render e no compose, e o Prometheus aceita `authorization` no scrape |
| D2 | Teto global de análises | Valor de `ANALYSIS_GLOBAL_DAILY_LIMIT` | 15, abaixo dos 20 por dia do plano gratuito, deixando folga para o parser |
| D3 | Contar upload e reescrita na mesma cota | (a) mesma cota, (b) cota separada | (b): a cota de análise do usuário não deve cair por causa de um upload |
| D4 | Bloqueio de conta | Tentativas e janela | 5 falhas em 15 minutos, bloqueio de 15 minutos |

---

## S1. Proteger o `/metrics`

**Problema:** `GET /metrics` responde 200 a qualquer pessoa no Render (verificado em 2026-11-07).

**Escopo**
- Variável opcional `METRICS_TOKEN`. Definida: `/metrics` exige `Authorization: Bearer <token>`. Não definida: comportamento atual (para o compose local).
- Guard próprio aplicado ao `MetricsController` (`infrastructure/metrics/metrics.module.ts`), com comparação em tempo constante (`timingSafeEqual`).
- `prometheus.yml`: o job `nestjs` envia o token por `authorization.credentials_file` ou variável.
- Documentar em `.env.example`, `docs/deploy-gratuito.md` e `docs/observabilidade.md`.

**Critérios de aceite**
- [ ] Com `METRICS_TOKEN` definido, `GET /metrics` sem header responde 401, com token errado 401, com token certo 200.
- [ ] Sem `METRICS_TOKEN`, responde 200 e o boot registra um aviso em produção.
- [ ] `/health` continua público.
- [ ] Teste do guard cobre os quatro casos acima.
- [ ] O Prometheus do compose continua raspando com sucesso (alvo `UP`).
- [ ] A lacuna 1 sai de `observabilidade.md` e a de `/metrics` sai de `owasp-top10.md`.

## S2. `trust proxy`

**Problema:** sem `trust proxy`, o `ThrottlerGuard` pode enxergar o IP do proxy e agrupar todos os usuários no mesmo limite.

**Escopo**
- Verificar primeiro, na demo, qual IP o limitador vê (log temporário ou teste local com `X-Forwarded-For`). Registrar o resultado no PR.
- Variável `TRUST_PROXY` (número de saltos, padrão 0), aplicada com `app.set('trust proxy', n)` em `main.ts`. Validada no boot em `constants.ts`.
- Na demo: 2 saltos (Vercel e Render), ajustável. Documentar no tutorial de deploy.

**Critérios de aceite**
- [ ] Com `TRUST_PROXY=1` e `X-Forwarded-For: 1.2.3.4`, `req.ip` é `1.2.3.4`. Sem a variável, não é.
- [ ] Valor inválido (negativo, texto) derruba o boot com mensagem clara.
- [ ] Dois IPs diferentes têm limites independentes (teste e2e ou do guard).
- [ ] O cliente não consegue forjar o limite além dos saltos confiáveis (documentar o risco de configurar saltos a mais).
- [ ] `LoggerMiddleware` passa a registrar o IP correto (hoje lê `x-forwarded-for` direto, sem validar).

## S3. Teto global e cota de upload e reescrita

**Problema:** a cota gratuita do Gemini é somada para todos, e upload e reescrita chamam o modelo sem entrar em cota alguma.

**Escopo**
- `ANALYSIS_GLOBAL_DAILY_LIMIT` (D2), contado por dia UTC sobre todos os usuários. Estourou: 429 com mensagem "A demo atingiu o limite diário de análises. Tente amanhã."
- Cota de estruturação (D3) por usuário e por dia, `PARSE_DAILY_LIMIT` (padrão 30), conferida em upload e reescrita. Estourou: o upload segue com seções vazias (o parser já degrada), sem erro para o usuário.
- Torná-la atômica: reservar a vaga antes de chamar o Gemini (contador por dia com `findOneAndUpdate` e `$inc` condicional) e devolver a vaga se a chamada falhar.
- Frontend: mensagem clara para o 429 global, distinta do 429 por usuário.

**Critérios de aceite**
- [ ] Com o teto global em N, a análise N+1 do dia responde 429 mesmo vindo de um usuário novo.
- [ ] 20 requisições simultâneas com cota restante de 1 resultam em exatamente 1 sucesso (teste de concorrência).
- [ ] Falha do Gemini devolve a vaga: a contagem do dia não sobe.
- [ ] Upload com a cota de estruturação esgotada responde 201 com seções vazias e registra um aviso.
- [ ] A virada do dia UTC zera os contadores (teste com relógio falso).
- [ ] `.env.example`, `README` e `integracao-gemini.md` atualizados. As lacunas de teto global, de upload fora da cota e de não atomicidade saem dos documentos.

## S4. Health check

**Problema:** `/health` não vê o MongoDB e depende do `google.com`.

**Escopo**
- Trocar `pingCheck('google')` por `MongooseHealthIndicator.pingCheck('mongodb')` em `terminus-options.check.ts`.
- Manter os checks de memória. Opcional: check de Gemini configurado (chave presente), sem chamar a API.

**Critérios de aceite**
- [ ] Com o banco derrubado, `/health` responde 503 com `mongodb` em `down`.
- [ ] Com `google.com` inacessível e o banco no ar, `/health` responde 200.
- [ ] O `HEALTHCHECK` do Docker e o health check do Render continuam passando.
- [ ] Teste unitário com indicador falso para os dois cenários.

## S5. Request id e log de requisição em todas as rotas

**Problema:** os middlewares cobrem só `AuthController` e `ProfileController`, e o request id do cliente é aceito sem validação.

**Escopo**
- Aplicar `RequestIdMiddleware` e `LoggerMiddleware` a todas as rotas (`forRoutes('*')`), mantendo o `SKIP_PATHS`.
- Validar o id recebido: só aceitar `^[A-Za-z0-9._-]{8,128}$`, senão gerar um UUID.
- Colocar o `RequestIdMiddleware` antes do `LoggerMiddleware`.

**Critérios de aceite**
- [ ] Resposta de qualquer rota (`/api/v1/resumes`, `/api/v1/dashboard/...`) traz `x-request-id`.
- [ ] `x-request-id: a b\nc` ou com 500 caracteres é descartado e substituído por UUID.
- [ ] Um id válido enviado pelo cliente volta no header e aparece no log.
- [ ] `/health` e `/metrics` continuam sem log de requisição.
- [ ] Teste do middleware cobre válido, inválido e ausente.
- [ ] As lacunas 2 e 3 de observabilidade e a nota de A09 saem dos documentos; README e `backend/README` voltam a dizer "todas as rotas".

## S6. Cadeia de suprimentos

**Escopo**
- Job `pnpm audit --prod --audit-level=high` na CI (backend e frontend), falhando em vulnerabilidade alta ou crítica. Decidir no PR se começa como aviso (`continue-on-error`) caso o estado atual já falhe.
- `.github/dependabot.yml`: npm (`backend`, `frontend`), GitHub Actions e Docker, semanal, PRs para `dev`.
- `backend/Dockerfile`: `node:20-alpine` para `node:24-alpine` nos dois estágios.
- Revisar os scripts de build ignorados pelo pnpm e registrar a decisão.

**Critérios de aceite**
- [ ] A CI mostra o job de auditoria, com resultado visível no PR.
- [ ] Dependabot aparece em Insights > Dependency graph e abre PRs para `dev`.
- [ ] `docker build` do backend passa com Node 24 e o contêiner sobe, com `/health` em 200.
- [ ] `pnpm test` do backend passa com Node 24 localmente.
- [ ] A lacuna de A03 sai de `owasp-top10.md`.

## S7. Métricas do Gemini e painel de erros

**Escopo**
- Em `MetricsModule`: `gemini_requests_total{operation, outcome}` (operation: `analyze` ou `parse`; outcome: `success`, `retry`, `failure`), `gemini_request_duration_seconds{operation}` e `gemini_prompt_tokens_total{operation}`.
- Instrumentar `analysis-generator.service.ts` e `structured-parser.service.ts` por injeção, sem mudar o contrato dos serviços.
- Dashboard `http-latency.json` ou novo `gemini-and-errors.json`: taxa de 5xx, proporção de 4xx e 5xx, vazão por rota, chamadas ao Gemini por resultado, latência p95 do Gemini e tokens por hora.

**Critérios de aceite**
- [ ] Após uma análise bem-sucedida, `/metrics` mostra `gemini_requests_total{operation="analyze",outcome="success"} 1`.
- [ ] Após falha nas duas tentativas, aparece `outcome="failure"` e uma linha `retry`.
- [ ] Testes dos serviços usam um contador falso e conferem as chamadas.
- [ ] O dashboard carrega no Grafana do compose sem erro, com os painéis novos.
- [ ] Os rótulos têm cardinalidade fixa (nada de id de usuário ou de currículo).
- [ ] As lacunas 5 e 6 saem de `observabilidade.md`.

## S8. Alertas

**Escopo**
- `prometheus/alerts.yml` com regras: 5xx acima de 5% por 5 min, p95 acima de 2 s por 10 min, falhas do Gemini acima de 20% por 10 min, pico de 401 e de 429.
- Carregar em `prometheus.yml` (`rule_files`). Alertmanager opcional no compose, com receiver de exemplo (webhook), sem segredos no repositório.

**Critérios de aceite**
- [ ] `promtool check rules` passa.
- [ ] No compose, gerar erros 5xx dispara o alerta no Prometheus (aba Alerts) em até 6 minutos.
- [ ] Documentar como ligar um destino real de notificação.
- [ ] A lacuna 7 sai de `observabilidade.md`.

## S9. Limpezas pequenas

- Remover o `console.log('Execution time...')` do `LoggingInterceptor` (as métricas já cobrem).
- Imprimir "Swagger documentation available" só quando o Swagger é montado (`main.ts`).
- Contar a fonte do `Execution time` no log estruturado se ainda for desejada, via `LoggerService`.

**Critérios de aceite**
- [ ] Em produção o log de boot não menciona o Swagger.
- [ ] Nenhum `console.log` em `src/` (conferir com Grep).
- [ ] Testes existentes seguem verdes.

## S10. Endurecimento adicional

- **AES-GCM:** trocar AES-256-CBC por AES-256-GCM em `auth.model.ts`, guardando IV e tag. Migração: ler os dois formatos (prefixo de versão), regravar no formato novo no próximo login. Teste de ida e volta, de adulteração (deve falhar) e de leitura do formato antigo.
- **Bloqueio de conta (D4):** contador de falhas por conta, bloqueio temporário com 429 e mensagem genérica, zerado no sucesso. Teste de limite, de expiração e de que o contador não vaza se o e-mail existe.
- **Proteção de branch:** exigir a CI verde e uma revisão nas regras de `main` e `dev` (ação do dono em Settings > Branches). O agente prepara o texto, não aplica.

**Critérios de aceite**
- [ ] Dados cifrados no formato antigo continuam legíveis e passam ao novo ao serem regravados.
- [ ] Adulterar um byte do texto cifrado novo faz a leitura falhar.
- [ ] Após 5 falhas em 15 minutos, o login responde 429 por 15 minutos, inclusive com a senha certa.
- [ ] A lacuna de A04 (CBC), a de A07 (bloqueio) e a de A08 (CI obrigatória) saem de `owasp-top10.md` quando concluídas.

## Definição de pronto (vale para todos os itens)

- [ ] Critérios do item marcados, com o teste correspondente no PR.
- [ ] CI verde no PR para `dev`.
- [ ] Documento de origem atualizado: a lacuna sai da lista e o controle novo entra em "O que existe", nos dois idiomas (`*.md` e `*.en.md`).
- [ ] Variáveis novas em `backend/.env.example` e no tutorial `docs/deploy-gratuito.md`.
- [ ] Nenhum número ou comportamento citado sem ter sido executado.
