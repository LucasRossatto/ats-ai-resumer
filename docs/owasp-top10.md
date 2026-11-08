# Segurança e o OWASP Top 10

[English](owasp-top10.en.md) | **Português**

Este documento mapeia o backend para as categorias do [OWASP Top 10:2025](https://owasp.org/Top10/2025/): o que já está implementado, com o arquivo onde se vê, e o que ainda falta.

Atualizado em 2026-11-07, depois das correções de segurança dos PRs #32 (login, JWT, dependências, `/metrics`, `trust proxy`) e #33 (integração com o Gemini). A demo pública roda a `main`, que já inclui essas correções. Onde o texto fala da demo, ele diz o que foi conferido de fora e o que só foi informado pelo dono do repositório.

**Isto é uma autoavaliação, não uma auditoria nem uma certificação.** Foi feita lendo o código e a configuração, sem teste de intrusão. Quando uma afirmação não pôde ser verificada, ela está marcada como tal. A lista oficial deve ser conferida em [owasp.org/Top10](https://owasp.org/Top10/2025/).

## Resumo

| Categoria | Situação | Em uma linha |
| --- | --- | --- |
| A01 Broken Access Control | Atende | Dono do recurso conferido em todas as rotas de currículo e conta |
| A02 Security Misconfiguration | Atende | Helmet, CORS, Swagger fora de produção, `/metrics` com token e `trust proxy` conferido na demo; restam notas sobre o compose local |
| A03 Software Supply Chain Failures | Parcial | Lockfile, audit de produção, Dependabot, CodeQL e Node 24 na imagem; falta auditar as dependências de desenvolvimento e exigir a CI no merge |
| A04 Cryptographic Failures | Parcial | bcrypt, SHA-256 e AES-256 no lugar e JWT fixo em HS256, mas o AES usa modo CBC |
| A05 Injection | Atende | Validação rígida de entrada e consultas tipadas |
| A06 Insecure Design | Parcial | Cotas e limites de taxa em todas as rotas de negócio, com a cota contando requisições em andamento; falta teto global e a cota vale por instância |
| A07 Authentication Failures | Parcial | Sessão e refresh bem resolvidos e Google exige e-mail verificado; sem bloqueio de conta nem MFA, e o pré-sequestro de conta segue em aberto |
| A08 Software or Data Integrity Failures | Parcial | Saída da IA tratada como dado não confiável e deploy só depois da CI; sem assinatura de artefatos |
| A09 Security Logging and Alerting Failures | Parcial | Logs sem dados pessoais, mas sem alertas |
| A10 Mishandling of Exceptional Conditions | Atende | Filtro global de exceções, sem vazamento de detalhes |

## A01: Broken Access Control

**O que existe**

- **Autenticação nas rotas protegidas** com `AuthGuard('jwt')`.
- **Dono do recurso em toda rota de currículo e análise.** O serviço carrega o currículo por `findByIdAndUserId(id, userId)` (`loadOwnedResume` em `resume.service.ts` e `analysis.service.ts`). Um currículo de outra pessoa responde 404, indistinguível de um que não existe.
- **Rotas de conta só para o dono ou um admin.** `GET /auth/:id` e `DELETE /auth/:id` respondem 403 para outro usuário (`auth.service.ts`). A resposta usa `CurrentUser`, nunca a entidade que carrega o hash da senha e o do refresh token.
- **Papéis por `RolesGuard`** nas rotas administrativas de `profile` (`roles.guard.ts`, com teste em `__test__/roles.guard.spec.ts`).
- **Sem SSRF por entrada do usuário.** O backend só chama endereços fixos (Gemini e Google OAuth).

**Lacunas**

- Os papéis do usuário vêm do JWT, então uma mudança de papel só vale depois que o access token (1 h por padrão) expira.
- `GET /hello` é público de propósito.

## A02: Security Misconfiguration

**O que existe**

- **`helmet`** e **CORS restrito** a `CORS_ORIGINS` com credenciais (`main.ts`).
- **`ValidationPipe` com `whitelist` e `forbidNonWhitelisted`:** campo não declarado no DTO derruba a requisição com 400.
- **Swagger só fora de produção** (`NODE_ENV !== 'production'`).
- **Falha no boot** se `JWT_SECRET` ou `JWT_REFRESH_SECRET` tiverem menos de 32 caracteres, se `EMAIL_ENCRYPTION_KEY` não tiver exatamente 64 hex, ou se `COOKIE_SAMESITE` for inválido (`constants.ts`).
- **Cookie do refresh token** `httpOnly`, `Secure` em produção, `SameSite` configurável e com `Path` restrito a `/api/v1/auth`.
- **Docker:** imagem multi-stage, execução como usuário `node`, `HEALTHCHECK` e tags fixas nas imagens de terceiros.
- **`/metrics` com token opcional.** Com `METRICS_TOKEN` definido, a rota exige `Authorization: Bearer` e responde 403 sem ele ou com um valor errado; a comparação usa `timingSafeEqual` (`metrics-token.guard.ts`, testado em `metrics-token.guard.spec.ts`). Em produção sem a variável, o boot imprime um aviso.
- **`trust proxy` configurável** por `TRUST_PROXY` (inteiro de 0 a 5, padrão 0). Valor inválido derruba o boot (`constants.ts`, testado em `trust-proxy.config.spec.ts`). **Na demo (Vercel e Render) o valor é 1, conferido em 2026-11-08:** uma requisição pelo domínio da Vercel apareceu no log com o IP real do visitante, e um `X-Forwarded-For` forjado pelo cliente foi ignorado. Com um valor maior que 1, o IP forjado passou a valer como IP do cliente.

**Lacunas**

- **O `/metrics` só fica protegido onde `METRICS_TOKEN` estiver definido.** Na demo ele está: em 2026-11-08 a rota respondeu 403 sem credencial (conferido pelo dono do repositório, depois de reconstruir o serviço no Render). Sem a variável, como no uso local, a rota segue aberta (veja [observabilidade](observabilidade.md#lacunas-conhecidas)).
- **`TRUST_PROXY` precisa bater com a cadeia real de proxies, e o padrão é 0.** Com um valor menor que o real, o IP visto pelo limitador de taxa é o do proxy e todos os usuários dividem o mesmo limite. Com um valor maior, o cliente forja o IP e escapa do limite. Se a hospedagem mudar, repita o teste descrito em `docs/deploy-gratuito.md`.
- O Prometheus do compose não envia token por padrão. Se `METRICS_TOKEN` for definido localmente, o scrape recebe 403 até que o bloco `authorization` de `prometheus.yml` (já presente, comentado) seja ativado com o token em `prometheus/metrics_token`, arquivo que o git ignora.
- O compose publica as portas do Prometheus e do Grafana. Em um servidor exposto, restrinja o acesso.

## A03: Software Supply Chain Failures

**O que existe**

- `pnpm-lock.yaml` versionado, `pnpm install --frozen-lockfile` no `Dockerfile` e na CI.
- Imagens de terceiros do compose com tags fixas, e a imagem do backend em `node:24-alpine` (build e `bcrypt` conferidos em 2026-11-07).
- **Dependabot** (`.github/dependabot.yml`): atualizações semanais e agrupadas de npm (backend e frontend), GitHub Actions e Docker, com PRs contra a `dev`.
- **CodeQL** (`.github/workflows/codeql.yml`) em PRs, pushes e uma varredura semanal.
- CI roda audit de dependências, lint, testes e build a cada PR, cada etapa como um job próprio.
- **`pnpm audit --prod --audit-level=high` na CI** (etapa `backend / audit`): vulnerabilidade alta ou crítica em dependência de produção reprova o PR. Em 2026-11-07 o audit não reportava nenhuma. O `multer` transitivo está fixado em `>=2.5.0` por `pnpm.overrides`.
- **Deploy só depois da CI.** O job de deploy depende de todas as etapas e só roda em push na `main`.
- Os scripts de build de dependências são limitados por `onlyBuiltDependencies` (`bcrypt` e `unrs-resolver`).

**Lacunas**

- **O audit cobre só dependências de produção**, e as de desenvolvimento não foram avaliadas.
- **Dependabot e CodeQL acabaram de ser configurados.** Os primeiros PRs e alertas só aparecem depois do merge. O Dependabot usa o pnpm 10 do `packageManager`, e a CI usa o 9, então o lockfile de um PR dele pode precisar de ajuste.
- A regra de proteção das branches só impede exclusão e force push. Ela não exige a CI verde nem revisão antes do merge.

## A04: Cryptographic Failures

**O que existe**

- **Senhas** com bcrypt, custo 10 (`auth.model.ts` e `auth.service.ts`).
- **Refresh token** guardado como SHA-256 e comparado com `timingSafeEqual` (`refresh-token-hash.ts`). O bcrypt não serve para isso: ele só lê os 72 primeiros bytes, idênticos entre tokens do mesmo usuário.
- **E-mail cifrado em repouso** com AES-256-CBC e chave de 64 hex validada no boot, mais um blind index por HMAC-SHA256 com segredo próprio, para consulta sem decifrar tudo.
- **HTTPS** nos serviços de hospedagem, e cookie `Secure` em produção.
- **JWT com algoritmo fixo em HS256** na assinatura e na verificação (`auth.module.ts`, `jwt.strategy.ts`, `auth.service.ts`). Um token com `alg: none` é rejeitado (teste em `security-hardening.spec.ts`).

**Lacunas**

- O **AES-CBC não autentica** o dado cifrado. O modo GCM, que detecta adulteração, seria preferível.
- Os JWTs usam segredo simétrico, e o payload do access token carrega o e-mail em texto legível (o JWT é assinado, não cifrado).

## A05: Injection

**O que existe**

- Todos os corpos passam pelo `ValidationPipe` com `class-validator` (`IsEmail`, `IsString`, `MinLength` etc.), o que impede objetos de operador do Mongo (como `{ "$ne": null }`) onde se espera texto.
- Consultas feitas pelo Mongoose com filtros tipados, sem montar consulta por concatenação de texto.
- Upload aceita só PDF, com limite de 5 MB e checagem do tipo e da assinatura `%PDF-` (`upload.service.ts`).
- O texto do currículo vai ao Gemini entre tags `<resume>` e `</resume>`, tanto na análise quanto no parser. As tags são removidas do conteúdo até não sobrar nenhuma (`stripTag`), então nem uma tag aninhada como `<</resume>/resume>` fecha o bloco. O cargo alvo também vai entre tags, em uma linha (veja a [integração com o Gemini](integracao-gemini.md)).
- Links extraídos do currículo pelo Gemini só mantêm `http`, `https` e `mailto`.

**Lacunas**

- Não há uma camada explícita de sanitização de operadores do Mongo. A proteção depende de os DTOs tiparem cada campo.
- Injeção de prompt é um risco próprio de sistemas com LLM e só é mitigada, não eliminada.

## A06: Insecure Design

**O que existe**

- **Cota que conta requisições em andamento** (`quota-reservations.ts`): a vaga é reservada de forma síncrona depois de contar o que já foi gravado, então requisições paralelas do mesmo usuário não passam do limite (teste em `analysis.service.spec.ts`).
- **Todas as rotas de negócio usam o `ThrottlerGuard`**, inclusive `Hello` e `Profile`. Só `/health` e `/metrics` ficam de fora, de propósito (teste em `throttle-coverage.spec.ts`).
- **Controle de custo da IA:** cota diária por usuário (`ANALYSIS_DAILY_LIMIT`, dia UTC) e limite de 5 análises por minuto. Criar currículo e aplicar reescrita, que também chamam o Gemini, têm a cota `PARSE_DAILY_LIMIT` (padrão 20 currículos por usuário por dia e 20 versões por currículo por dia) e respondem 429 quando ela acaba.
- **Limites de taxa por rota** com `@nestjs/throttler`: 3 por minuto no login, 5 no registro e 10 em upload e criação de currículo.
- **Limite de tamanho e de tipo** no upload, e corte do texto do currículo em 30.000 caracteres antes de ir ao Gemini.
- Modelo de dados em que toda consulta carrega o dono.

**Lacunas**

- **Não há teto global de análises.** A cota gratuita do Gemini é pequena e compartilhada, então poucos usuários a esgotam.
- A reserva da cota vive na memória do processo, então vale para uma única instância. Com várias instâncias, seria preciso um contador no banco. Tentativas que falham no Gemini não contam na cota.

## A07: Authentication Failures

**O que existe**

- **Sessão:** o access token fica só em memória no frontend, e o refresh token vai em cookie `httpOnly`.
- **Rotação do refresh token a cada uso, com detecção de reuso:** apresentar um token antigo responde 401.
- **Limite de tentativas** de login (3 por minuto) e mensagem genérica para senha errada.
- **Google OAuth com `state` CSRF** em cookie `httpOnly`, validado na volta.
- Senha com mínimo de 8 e máximo de 128 caracteres (o teto evita custo desnecessário no bcrypt).
- **Google exige `email_verified: true`.** Sem isso a API responde 401 e não toca na conta. As chamadas ao Google têm timeout de 10 s e não seguem redirecionamento (`auth.service.ts`).

**Lacunas**

- **Pré-sequestro de conta em aberto.** Quem registra o e-mail de outra pessoa mantém a senha depois que a vítima entra pelo Google. As saídas são verificar o e-mail no registro, ou apagar a senha e revogar o refresh token ao ligar o Google a uma conta que já tem senha. A decisão está pendente.

- Não há **bloqueio de conta** após falhas repetidas, nem MFA.
- A política de senha é só o tamanho mínimo, sem verificação de senhas vazadas.
- O registro responde 409 ("An account with this email already exists"), o que permite descobrir se um e-mail está cadastrado (um trade-off comum).
- Um access token válido não pode ser revogado antes de expirar.

## A08: Software or Data Integrity Failures

**O que existe**

- **A saída do Gemini é tratada como dado não confiável.** Ela é forçada a um schema, passa por `JSON.parse` e é normalizada e limitada a faixas válidas antes de ser gravada (`normalize` em `analysis-generator.service.ts`), com teto de 20 itens (50 palavras-chave) e 2000 caracteres por campo.
- A CI valida cada PR antes do merge, e o deploy só roda na `main` depois de todas as etapas passarem.
- Instalação com lockfile congelado.

**Lacunas**

- As imagens e artefatos de build não são assinados, e não há atestado de origem (provenance).
- Não há revisão obrigatória nem CI obrigatória nas branches protegidas.

## A09: Security Logging and Alerting Failures

**O que existe**

- Logs estruturados com nível e contexto, e log de cada requisição HTTP com status, duração e `requestId` (nas rotas de auth e profile).
- **Sem dados pessoais:** e-mail, senha e token não são logados, e o corpo da requisição nunca é logado em produção.
- Falhas de login são registradas com o id do usuário.

**Lacunas**

- **Não há alertas.** Nenhuma regra dispara aviso em picos de 401, 429 ou 5xx.
- O log de requisição cobre só as rotas de auth e profile (veja [observabilidade](observabilidade.md#lacunas-conhecidas)).
- Os logs ficam na saída do contêiner, sem coleta central.

## A10: Mishandling of Exceptional Conditions

**O que existe**

- **Filtro global de exceções** (`ApiExceptionFilter`): erros que não são HTTP viram `500 INTERNAL_ERROR` com mensagem genérica, sem stack nem detalhes internos.
- **Regras de negócio violadas viram 400** pelo `DomainValidationError`, em vez de 500.
- **Falhas do Gemini viram 503** com mensagem controlada, depois de duas tentativas com espera. Cada chamada tem timeout de 30 s e limite de tokens de saída.
- O parser de currículo tem **fallback**: se o Gemini falhar, o upload segue com seções vazias.
- Upload grande demais ou fora do tipo respondem 413 e 400 por um filtro próprio do `multer`.
- Testes em `application/__test__/api-exception.filter.spec.ts` e `infrastructure/__test__/analysis-generator.retry.spec.ts`.

**Lacunas**

- O health check não detecta o banco fora do ar (veja [observabilidade](observabilidade.md#lacunas-conhecidas)).

## Prioridades

1. Decidir o pré-sequestro de conta.
2. Revisar os primeiros PRs do Dependabot e os alertas do CodeQL, e auditar as dependências de desenvolvimento.
3. Teto global de análises.
4. Bloqueio de conta e trocar o AES-CBC por AES-GCM.
5. Alertas para 5xx e picos de 401 e 429.
