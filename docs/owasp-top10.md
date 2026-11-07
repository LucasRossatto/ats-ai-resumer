# Segurança e o OWASP Top 10

[English](owasp-top10.en.md) | **Português**

Este documento mapeia o backend para as categorias do [OWASP Top 10:2025](https://owasp.org/Top10/2025/): o que já está implementado, com o arquivo onde se vê, e o que ainda falta.

**Isto é uma autoavaliação, não uma auditoria nem uma certificação.** Foi feita lendo o código e a configuração, sem teste de intrusão. Quando uma afirmação não pôde ser verificada, ela está marcada como tal. A lista oficial deve ser conferida em [owasp.org/Top10](https://owasp.org/Top10/2025/).

## Resumo

| Categoria | Situação | Em uma linha |
| --- | --- | --- |
| A01 Broken Access Control | Atende | Dono do recurso conferido em todas as rotas de currículo e conta |
| A02 Security Misconfiguration | Parcial | Boa base (helmet, CORS, Swagger fora de produção), mas `/metrics` público |
| A03 Software Supply Chain Failures | Parcial | Lockfile e instalação congelada, mas sem auditoria de dependências e com Node 20 na imagem |
| A04 Cryptographic Failures | Parcial | bcrypt, SHA-256 e AES-256 no lugar, mas o AES usa modo CBC |
| A05 Injection | Atende | Validação rígida de entrada e consultas tipadas |
| A06 Insecure Design | Parcial | Cotas e limites de taxa existem, mas há brechas no controle de custo da IA |
| A07 Authentication Failures | Parcial | Sessão e refresh bem resolvidos, sem bloqueio de conta nem MFA |
| A08 Software or Data Integrity Failures | Parcial | Saída da IA tratada como dado não confiável, sem assinatura de artefatos |
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

**Lacunas**

- **`/metrics` é público** no servidor do Render (veja [observabilidade](observabilidade.md#lacunas-conhecidas)).
- O log "Swagger documentation available" é impresso mesmo em produção, embora a rota não exista.
- Não há `trust proxy` configurado. Atrás do Render e da Vercel, o IP visto pelo limitador de taxa pode ser o do proxy (**não verificado em produção**), o que faria todos os usuários dividirem o mesmo limite.
- O compose publica as portas do Prometheus e do Grafana. Em um servidor exposto, restrinja o acesso.

## A03: Software Supply Chain Failures

**O que existe**

- `pnpm-lock.yaml` versionado, `pnpm install --frozen-lockfile` no `Dockerfile` e na CI.
- Imagens de terceiros do compose com tags fixas.
- CI roda lint, testes e build a cada PR.

**Lacunas**

- **Não há auditoria de dependências** na CI (`pnpm audit`), nem Dependabot, nem análise de código (CodeQL).
- **A imagem usa `node:20-alpine`.** Pelo calendário de versões do Node.js, a linha 20 saiu de suporte em abril de 2026 (confirme em nodejs.org). A CI já roda em Node 24.
- O `pnpm` avisa que ignorou scripts de build de algumas dependências; vale revisar com `pnpm approve-builds`.
- A regra de proteção das branches só impede exclusão e force push. Ela não exige a CI verde nem revisão antes do merge.

## A04: Cryptographic Failures

**O que existe**

- **Senhas** com bcrypt, custo 10 (`auth.model.ts` e `auth.service.ts`).
- **Refresh token** guardado como SHA-256 e comparado com `timingSafeEqual` (`refresh-token-hash.ts`). O bcrypt não serve para isso: ele só lê os 72 primeiros bytes, idênticos entre tokens do mesmo usuário.
- **E-mail cifrado em repouso** com AES-256-CBC e chave de 64 hex validada no boot, mais um blind index por HMAC-SHA256 com segredo próprio, para consulta sem decifrar tudo.
- **HTTPS** nos serviços de hospedagem, e cookie `Secure` em produção.

**Lacunas**

- O **AES-CBC não autentica** o dado cifrado. O modo GCM, que detecta adulteração, seria preferível.
- Os JWTs são assinados com segredo simétrico (HS256) e o payload do access token carrega o e-mail em texto legível (o JWT é assinado, não cifrado).

## A05: Injection

**O que existe**

- Todos os corpos passam pelo `ValidationPipe` com `class-validator` (`IsEmail`, `IsString`, `MinLength` etc.), o que impede objetos de operador do Mongo (como `{ "$ne": null }`) onde se espera texto.
- Consultas feitas pelo Mongoose com filtros tipados, sem montar consulta por concatenação de texto.
- Upload aceita só PDF, com limite de 5 MB e checagem do tipo e da assinatura `%PDF-` (`upload.service.ts`).
- O texto do currículo vai ao Gemini entre tags `<resume>` e `</resume>`, e a tag de fechamento é removida do conteúdo (veja a [integração com o Gemini](integracao-gemini.md)).

**Lacunas**

- Não há uma camada explícita de sanitização de operadores do Mongo. A proteção depende de os DTOs tiparem cada campo.
- Injeção de prompt é um risco próprio de sistemas com LLM e só é mitigada, não eliminada.

## A06: Insecure Design

**O que existe**

- **Controle de custo da IA:** cota diária por usuário (`ANALYSIS_DAILY_LIMIT`, dia UTC) e limite de 5 análises por minuto.
- **Limites de taxa por rota** com `@nestjs/throttler`: 3 por minuto no login, 5 no registro e 10 em upload e criação de currículo.
- **Limite de tamanho e de tipo** no upload, e corte do texto do currículo em 30.000 caracteres antes de ir ao Gemini.
- Modelo de dados em que toda consulta carrega o dono.

**Lacunas**

- **Não há teto global de análises.** A cota gratuita do Gemini é pequena e compartilhada, então poucos usuários a esgotam.
- **O upload e a reescrita também chamam o Gemini** (para estruturar o texto), mas só as análises contam no `ANALYSIS_DAILY_LIMIT`.
- A verificação da cota e a criação da análise não são atômicas: requisições simultâneas podem passar um pouco do limite.
- `HelloController` e `ProfileController` não usam o `ThrottlerGuard`.

## A07: Authentication Failures

**O que existe**

- **Sessão:** o access token fica só em memória no frontend, e o refresh token vai em cookie `httpOnly`.
- **Rotação do refresh token a cada uso, com detecção de reuso:** apresentar um token antigo responde 401.
- **Limite de tentativas** de login (3 por minuto) e mensagem genérica para senha errada.
- **Google OAuth com `state` CSRF** em cookie `httpOnly`, validado na volta.
- Senha com mínimo de 8 caracteres.

**Lacunas**

- Não há **bloqueio de conta** após falhas repetidas, nem MFA.
- A política de senha é só o tamanho mínimo, sem verificação de senhas vazadas.
- O registro responde 409 ("An account with this email already exists"), o que permite descobrir se um e-mail está cadastrado (um trade-off comum).
- Um access token válido não pode ser revogado antes de expirar.

## A08: Software or Data Integrity Failures

**O que existe**

- **A saída do Gemini é tratada como dado não confiável.** Ela é forçada a um schema, passa por `JSON.parse` e é normalizada e limitada a faixas válidas antes de ser gravada (`normalize` em `analysis-generator.service.ts`).
- A CI valida cada PR antes do merge.
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
- **Falhas do Gemini viram 503** com mensagem controlada, depois de duas tentativas com espera.
- O parser de currículo tem **fallback**: se o Gemini falhar, o upload segue com seções vazias.
- Upload grande demais ou fora do tipo respondem 413 e 400 por um filtro próprio do `multer`.
- Testes em `application/__test__/api-exception.filter.spec.ts` e `infrastructure/__test__/analysis-generator.retry.spec.ts`.

**Lacunas**

- O health check não detecta o banco fora do ar (veja [observabilidade](observabilidade.md#lacunas-conhecidas)).

## Prioridades

1. Proteger o `/metrics` e configurar `trust proxy`.
2. Atualizar a imagem para uma versão do Node com suporte e ligar Dependabot e `pnpm audit` na CI.
3. Teto global de análises e contagem das chamadas de upload e reescrita na cota.
4. Bloqueio de conta e trocar o AES-CBC por AES-GCM.
5. Alertas para 5xx e picos de 401 e 429.
