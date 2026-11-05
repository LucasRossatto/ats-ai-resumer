# Backlog de pendências da auditoria (parciais e não implementados)

Data: 2026-11-04
Base: branch `fix/auditoria-onda-1` (backend com build, lint e 304 testes verdes).
Origem: verificação item a item da spec `2026-11-04-correcoes-auditoria.md`.

## Regra de base para qualquer agente

Os worktrees dos agentes partem de `origin/main`, que está atrás do branch real. Primeiro passo obrigatório de todo agente: `git reset --hard fix/auditoria-onda-1` dentro do worktree, depois `pnpm install`. Sem isso o trabalho é feito contra código antigo.

## Legenda

- 🟡 parcial: começou, falta fechar.
- ❌ não implementado.
- **[medir]**: número ou estado a confirmar no código real antes de corrigir.

---

# Parte 1: Parciais

## P1. Camadas ainda vazando (A5) 🟡

**Estado:** a regra ESLint existe, mas está desligada em 5 arquivos, mais um spec fora do lugar.

| Arquivo | Importa de `@api` | Como corrigir |
|---|---|---|
| `application/auth/command/create-auth-user.command.ts` | `RegisterAuthDto` | O comando recebe um tipo próprio (`interface RegisterInput`) definido em `application/auth`. O controller converte o DTO para esse tipo. |
| `application/services/auth.service.ts` | `LoginAuthDto`, `RegisterAuthDto`, `UpdateProfileDto` | Mesmos tipos de entrada na aplicação (`LoginInput`, `RegisterInput`, `UpdateProfileInput`). Os DTOs implementam essas interfaces. |
| `application/services/profile.service.ts` | `CreateProfileDto` | Idem: `CreateProfileInput`. |
| `application/services/response.service.ts` | `api-response.dto` | Mover os envelopes de resposta (`SuccessResponseDto` etc.) para `application/dto/` e reexportar do `api` se o Swagger precisar. |
| `infrastructure/swagger/swagger-configurator.service.ts` | 10 controllers | É raiz de composição, não infraestrutura. Mover para `src/api/swagger/` (ou `src/` ao lado do `main.ts`). |
| `domain/__test__/profile.service.spec.ts` | `@application`, `@infrastructure` | O spec testa um serviço de aplicação. Mover para `application/__test__/`. |

**Passos:** criar os tipos, trocar os imports, mover os arquivos, remover o bloco de exceções (e o `TODO(layering)`) do `eslint.config.mjs`.

**Impacto:**
- A regra passa a valer em 100% do código, sem exceção silenciosa.
- Elimina a resposta fraca para a pergunta de entrevista "seu `infrastructure` importa de `@api`".
- Risco médio: `auth.service.ts` é central. A suíte completa precisa passar após cada troca.

**Esforço:** 4 a 5 h.

## P2. `ANALYSIS_DAILY_LIMIT` não documentada (A6) 🟡

**Como corrigir:** acrescentar `ANALYSIS_DAILY_LIMIT=20` com comentário ao `backend/.env.example` e à tabela de variáveis do `backend/README.md`.

**Impacto:** quem opera o sistema descobre o controle de custo do Gemini. Hoje o padrão de 20 é invisível, e o limite pode ser raspado ou esquecido.

**Esforço:** 10 min.

## P3. E-mail ainda vai para o log no registro (A7) 🟡

**Estado:** `application/auth/command/handler/create-auth-user.handler.ts` loga o e-mail nas linhas 27 e 37 (`Starting user registration for email: ${email}` e `Registration failed - email already exists: ${email}`).

**Como corrigir:** remover o e-mail das mensagens. Logar só "registro iniciado" e "e-mail já cadastrado", com `requestId` se existir. Teste: espiar o logger e afirmar que nenhuma chamada contém o e-mail.

**Impacto:** o e-mail é cifrado em repouso e depois aparece em texto claro nos logs. Isso desfaz o benefício da cifra e é um problema de LGPD.

**Esforço:** 30 min.

## P4. CI do frontend com npm (T2) 🟡

**Estado:** o job `frontend` do `.github/workflows/ci.yml` usa `npm ci` e `cache: npm`, porque o Agente 2 viu só o `package-lock.json`.

**Como corrigir (depois de N5):** trocar por `pnpm/action-setup`, `cache: pnpm`, `cache-dependency-path: frontend/pnpm-lock.yaml`, `pnpm install --frozen-lockfile`, e adicionar os passos `typecheck` e `test` quando existirem (N7, N11). O passo `lint` só entra depois do N8, caso contrário o CI nasce vermelho.

**Impacto:** o CI do front passa a usar o mesmo gerenciador que o resto e vira um gate real. Hoje, com dois lockfiles, o resultado depende de qual instalar.

**Esforço:** 1 h.

---

# Parte 2: Não implementados (backend)

## N1. Docker e compose de produção (A4) ❌

**Estado:** `Dockerfile` com um só `FROM`, sem `USER`, com devDependencies na imagem; `mongo:latest` no compose base; Grafana com senha do `.env.example`.

**Como corrigir:**
1. Dockerfile multi-stage: estágio `build` (instala tudo e compila) e estágio `runtime` (`pnpm install --prod`, copia só `dist`). `USER node`. `HEALTHCHECK` chamando `/health`. Manter as ferramentas de compilação do bcrypt só no estágio `build`.
2. Fixar versões: `mongo:<tag>`, `prom/prometheus:<tag>`, `grafana/grafana:<tag>`.
3. Mongo com `MONGO_INITDB_ROOT_USERNAME/PASSWORD` e URI com credenciais.
4. Em produção, não publicar a porta do Mongo. Atenção: em Compose, `ports` do override **soma** com o do base. Use `ports: !reset []` (Compose v2.24 ou superior) ou mova o `ports` do Mongo para o override de dev.
5. `GRAFANA_PASSWORD` sem valor padrão no exemplo.

**Impacto:** reduz o raio de ataque de um RCE (processo sem root), tira o banco da rede pública, torna o build reproduzível e a imagem menor. É a diferença entre "roda no meu PC" e "pronto para deploy" (T3).

**Esforço:** 2 a 3 h.

## N2. Limpeza (A8) ❌

**Estado:** a pasta `application/middlewere` existe (2 referências). `moment` e `lodash` estão no `package.json`, mas **nenhum import foi encontrado** em `src/` fora dos testes.

**Como corrigir:**
- `git mv middlewere middleware` e ajustar as 2 referências.
- `pnpm remove moment lodash @types/lodash` (confirmar com `grep` também em `test/` e nos specs).
- Trocar os `any` dos coercers de `analysis-generator.service.ts` por `unknown` com type guards.

**Impacto:** corrige o erro de grafia visível no primeiro olhar à árvore, tira duas dependências mortas (menos superfície de CVE e instalação mais rápida), melhora a tipagem do ponto mais sensível (a saída do LLM). Risco baixo. Deve rodar **sozinho** ou junto de P1 pelo mesmo agente, porque ambos tocam imports.

**Esforço:** 1 a 2 h.

## N3. Eval do LLM (A9) ❌

**Como corrigir:** `backend/scripts/eval-analysis.ts` lê 10 currículos anônimos de `backend/test/fixtures/`, roda cada um N=5 vezes pelo `AnalysisGeneratorService`, e imprime média e desvio padrão do `atsScore` e a taxa de respostas que passaram no `normalize` sem correção. Script `pnpm eval`. Saída em `backend/docs/eval.md`.

**Pré-requisitos:** o prompt final (já mergeado, A7) e uma chave real do Gemini. **Você roda**, por causa do custo. Um agente escreve o script e os fixtures, e não executa chamadas reais.

**Impacto:** é o item de maior diferenciação do projeto. Responde com dados à pergunta "como você sabe que o score é confiável?", transforma a fraqueza principal em argumento de entrevista e dá o número para o README e o LinkedIn.

**Esforço:** 4 a 6 h.

---

# Parte 3: Não implementados (frontend)

## N5. Higiene do repositório (B2) ❌

**Estado confirmado no branch real:** `package-lock.json` e `pnpm-lock.yaml` estão ambos versionados; `"version": "0.0.'1"`; `CORRECOES_CODE_REVIEW.md` na raiz do front; `brag-output/` não ignorado.

**Como corrigir:** `git rm frontend/package-lock.json`, `pnpm install` para reconciliar o `pnpm-lock.yaml` (conferir o diff de versões antes de commitar), corrigir `version` para `0.0.1`, `git mv` do documento para `frontend/docs/`, `brag-output/` no `.gitignore`. Não tocar no `vite.config.js` (há alteração local sua).

**Impacto:** instalação determinística, base para o CI (P4) e para os testes (N11). Remove sinais de descuido que um recrutador vê no `package.json`.

**Esforço:** 30 min.

## N6. README do front (B1) ❌

**Como corrigir:** substituir o README padrão do Vite por um texto real: o que é, stack, variáveis (`VITE_API_URL`), scripts, estrutura de pastas **conferida com `ls` no branch real**, decisões (react-query, i18n, tema, proxy do Vite). O texto do Agente 5/4 serve de rascunho, mas precisa ser revalidado contra o front atual.

**Impacto:** quem abre a pasta `frontend/` entende e roda o projeto em minutos.

**Esforço:** 1 h.

## N7. `typecheck` e `strict` (B6) ❌

**Estado:** `strict: false` no `tsconfig.json` (com comentário "Fase 3 vai ligar strict progressivamente"). Não há script `typecheck`.

**Como corrigir:** adicionar `"typecheck": "tsc --noEmit"` (ou `tsc -b --noEmit`), **medir** o resultado no código real e registrar. Ligar `strict` é um item separado e opcional: ligar as flags uma a uma (`noImplicitAny` primeiro) e medir quantos erros surgem antes de decidir.

**Impacto:** o script dá um gate automático no CI. Ligar `strict` é o maior ganho de qualidade de tipos, mas pode ser custoso; por isso fica como decisão sua depois da medição.

**Esforço:** 30 min (script) mais 4 a 8 h (strict, opcional).

## N8. Lint do front e travessões (B7) ❌

**Como corrigir:**
- **[medir]** rodar `pnpm lint` no front real. O Agente 4 viu 37 erros no código antigo; o número real é desconhecido. Zerar por regra, começando pelas automáticas (`no-unused-vars`) e deixando as que exigem refatoração (`set-state-in-effect`, `only-export-components`) para itens próprios.
- `grep -rn "—" frontend/src/i18n/locales/pt-BR` e trocar por vírgula, ponto ou dois-pontos só nos valores.

**Impacto:** o lint verde permite ligar o passo no CI. Os travessões respeitam a regra de copy do projeto.

**Esforço:** 2 a 6 h, conforme o resultado da medição.

## N9. Tokens em cookie `httpOnly` e login Google (B3 + B4) ❌ (decisão: cookie)

**Estado:** `frontend/src/api/client.ts` guarda access e refresh em `localStorage`. O front **não tem rota `/auth/callback`**, e o backend só devolve `access_token` no fragmento do callback do Google. Resultado: **o login com Google não conclui hoje.**

**Como corrigir:**

*Backend:*
- `login`, `register`, `refresh-token` e o callback do Google gravam o refresh token em cookie `httpOnly; Secure (produção); SameSite=Lax; Path=/api/v1/auth`. O corpo da resposta passa a trazer só o `access_token`.
- `POST /auth/refresh-token` lê o cookie (o `cookie-parser` já está no `main.ts`). `logout` limpa o cookie.
- `handleGoogleRedirect` passa a gerar refresh token.
- O callback redireciona para `${FRONTEND_URL}/auth/callback` **sem nenhum token na URL**.
- Como o refresh usa cookie, o endpoint de refresh fica vulnerável a CSRF; mitigação: `SameSite=Lax` mais o fato de ser `POST` com CORS restrito a `CORS_ORIGINS`.

*Frontend:*
- `tokenStore.access` vira variável de módulo (em memória); remover as chaves do `localStorage`.
- `axios` com `withCredentials: true`.
- No boot, `AuthContext` chama `refresh` para restaurar a sessão.
- Nova rota `/auth/callback`: chama `refresh`, carrega o usuário, redireciona ao dashboard; trata `?error=invalid_state` com mensagem traduzida (`auth.json` pt-BR e en).

**Impacto:**
- Fecha o roubo de token por XSS, a pergunta de entrevista 5.
- Conserta o login com Google, que hoje não funciona.
- Muda o contrato da API (`refresh_token` sai do corpo); backend e front precisam ir juntos, num único agente e num único branch.
- Risco alto, pois mexe na autenticação. Exige testes de integração do fluxo.

**Esforço:** 8 a 10 h.

## N11. Testes do front (B5) ❌

**Estado:** zero arquivos de teste.

**Como corrigir:** Vitest + Testing Library + jsdom. Cobertura mínima: o `client.ts` (um só refresh para vários 401 simultâneos; rotas de `NO_REFRESH` não disparam refresh); `AuthContext` (boot com e sem sessão); `UploadDropzone` (rejeita não PDF); um fluxo feliz de login com a API mockada. Script `test` e passo no CI. **Esperar o N9**, senão os testes do `client.ts` são escritos duas vezes.

**Impacto:** o front deixa de ser a metade sem prova do projeto, e o CI passa a protegê-lo.

**Esforço:** 6 a 8 h.

---

# Parte 4: Não implementados (transversal)

## N12. READMEs (T1) ❌

**Estado:** o `README.md` da raiz não existe no branch; o conteúdo do Agente 5 está em `worktree-agent-abcc2b7d7168b30ba`, escrito contra o backend antigo e com 1 conflito em `backend/README.md`.

**Como corrigir:** partir dos dois textos do Agente 5, **reconciliar com o backend atual** (módulo de métricas, compose, Grafana, variáveis novas `CORS_ORIGINS`, `FRONTEND_URL`, `ANALYSIS_DAILY_LIMIT`, segredos JWT obrigatórios), preencher cobertura e CI com os números reais, deixar demo e eval como TODO até N3 e N13. Conferir de novo que nenhuma afirmação sobre Event Sourcing sobrevive.

**Impacto:** é a maior melhoria isolada para quem abre o repositório. Hoje o backend ainda traz o README do template. Também documenta que o app **não sobe** sem os dois segredos JWT.

**Esforço:** 3 a 4 h.

## N13. Deploy da demo (T3) ❌

**Como corrigir:** backend em Fly.io ou Render, MongoDB Atlas, front na Vercel ou Netlify. Segredos pela plataforma. `VITE_API_URL`, `CORS_ORIGINS` e `FRONTEND_URL` alinhados. Cookie `Secure` e `SameSite` revisados entre domínios diferentes (um domínio próprio em subdomínios facilita o cookie). **Feito por você**: exige suas contas e é ação pública.

**Pré-requisitos:** N1, N9, P2.

**Impacto:** sem demo, o projeto não é divulgável. É o que transforma o repositório em produto para o LinkedIn.

**Esforço:** 1 dia.

## N14. Nome do branch (T4) ❌

Renomear `feature/enchance-components` para `feature/enhance-components`. Ação sobre branch compartilhado: fazer só com sua confirmação e depois que o `fix/auditoria-onda-1` for integrado.

**Esforço:** 15 min.

## N15. Verificações residuais

- **[medir]** nome do produto: o commit `8eb8301` já fez o rebrand. Conferir `package.json` (`name`) e a chave de tema `arr-theme`. Mudar a chave do tema reseta a preferência dos usuários; decidir se vale.
- **[medir]** flake de `insights.service.spec.ts` sob cobertura, visto uma vez pelo Agente 2. Se repetir no CI, investigar o ts-jest.
- Cobertura do backend: 67% de statements e 48% de branches (medida antes de P1). Definir meta (ex.: 75% de statements) e ligar um `coverageThreshold`.

---

# Plano de execução

| Onda | Agentes (cada um em worktree, com `git reset --hard fix/auditoria-onda-1`) | Itens |
|---|---|---|
| **A** | A1 backend-camadas | P1, N2, P3 |
| | A2 backend-infra | N1, P2 |
| | A3 front-hygiene | N5, N6, N7 (script), N8 |
| | Eu | N12 (READMEs reconciliados) |
| **B** (após A) | B1 auth-cookie | N9 (backend e front juntos) |
| | B2 front-tests | N11, P4 |
| | B3 eval-script | N3 (sem chamadas reais) |
| **C** (você e eu) | | N13 deploy, N14, N15, eval real, preencher READMEs |

**Conflitos previstos:** A1 e A2 não compartilham arquivos. A3 não toca o `client.ts`, `AuthContext`, `routes.tsx`, reservados a B1. B2 espera o N5 (lockfile).

## Resumo de impacto por prioridade

| Prioridade | Itens | Por quê |
|---|---|---|
| Crítica | N12, N9, N1 | README honesto, login Google que funciona e token fora do `localStorage`, deploy seguro |
| Alta | P1, P3, N5, N11, P4 | Arquitetura defensável, LGPD, CI confiável |
| Média | N2, N3, N6, N7, N8, P2 | Polimento e a evidência do eval |
| Depende de você | N13, N14, N15 | Ações públicas e decisões de produto |

## Definição de pronto

- [ ] Nenhuma exceção no bloco de camadas do `eslint.config.mjs`.
- [ ] Nenhum e-mail em chamadas de logger.
- [ ] Dockerfile sem root, multi-stage, com versões fixas.
- [ ] Login com Google conclui ponta a ponta; nenhum token em `localStorage`.
- [ ] Front com lint, typecheck e testes verdes no CI, com pnpm.
- [ ] README raiz e do backend verificados contra o código atual.
- [ ] Eval publicado com números.
- [ ] Demo pública acessível.
