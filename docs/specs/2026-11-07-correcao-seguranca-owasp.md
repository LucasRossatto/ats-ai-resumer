# Spec: correção dos achados da revisão de segurança

Data: 2026-11-07
Origem: revisão estática do backend com `pnpm audit --prod` (OWASP Top 10:2025 e API Security Top 10:2023). Itens S1 e S2 vêm de `2026-11-07-lacunas-tecnicas.md`.
Branch: `fix/seguranca-owasp`, PR para `dev`.

## Escopo e fora de escopo

Entra: os 8 achados da revisão, exceto o pré-sequestro de conta (decisão pendente, ver F3).
Não entra: paginação, verificação de e-mail, bloqueio de conta, AES-GCM, teto global de análises e métricas do Gemini (specs `lacunas-tecnicas` e `owasp-api-top10`).

## Itens

| Id | Achado | Severidade | Situação |
| --- | --- | --- | --- |
| F1 | Dependências com 1 crítica e 34 altas | Alta | Resolvido |
| F2 | Login Google sem `email_verified` | Alta | Resolvido |
| F3 | Pré-sequestro de conta (registro sem verificação de e-mail) | Média | **Pendente de decisão do dono** |
| F4 | JWT sem algoritmo fixado | Média | Resolvido |
| F5 | Senha sem tamanho máximo | Média | Resolvido |
| F6 | Google OAuth sem timeout | Média | Resolvido |
| F7 | `/metrics` público | Baixa | Resolvido (opcional por variável) |
| F8 | Sem `trust proxy` | Baixa | Resolvido (configurável, padrão 0) |

## F1. Dependências

**Critérios de aceite**
- [x] `pnpm audit --prod` termina com "No known vulnerabilities found".
- [x] `multer` deixa de ser fixado em `2.0.2`: dependência direta `^2.5.0` e `pnpm.overrides` para a cópia transitiva do `@nestjs/platform-express`.
- [x] A CI roda `pnpm audit --prod --audit-level=high` e falha o PR se aparecer vulnerabilidade alta ou crítica.
- [x] Lint, build e os 359 testes passam com as versões novas.

Observação: o audit cobre só dependências de produção. As de desenvolvimento não foram avaliadas.

## F2. Google `email_verified`

**Critérios de aceite**
- [x] `email_verified: false` responde 401 e **não** altera a conta (`update` não é chamado).
- [x] Resposta sem `email_verified` ou sem e-mail responde 401.
- [x] `email_verified: true` segue o fluxo atual (teste existente atualizado).
- [x] A recusa gera um log `WARNING` sem o e-mail.

## F3. Pré-sequestro de conta (pendente)

O registro por senha não verifica o e-mail. Alguém pode registrar o e-mail de outra pessoa e, quando a vítima entrar com o Google, o `googleId` é ligado à mesma conta, e a senha do atacante continua válida.

**Decisão do dono (D1):**
- (a) verificação de e-mail no registro (precisa de provedor de e-mail);
- (b) ao ligar o Google a uma conta que tem senha, apagar a senha e revogar o refresh token. Custa o login por senha de quem usava os dois;
- (c) aceitar o risco na demo.

Recomendação: (b) agora, (a) se virar produção real. **Não implementado neste PR.**

## F4. Algoritmo do JWT

**Critérios de aceite**
- [x] `JwtStrategy` aceita só `HS256`.
- [x] `JwtModule`, o access token e o refresh token são assinados com `HS256`, e o refresh é verificado com `algorithms: ['HS256']`.
- [x] Teste: token `alg: none` é rejeitado na verificação.

## F5. Tamanho da senha

**Critérios de aceite**
- [x] `@MaxLength(128)` em registro, login, `change-password` e `update-password`.
- [x] Teste: 129 caracteres falham com `maxLength` e 128 passam, nos quatro DTOs.

## F6. Timeout do Google

**Critérios de aceite**
- [x] As duas chamadas (`token` e `userinfo`) usam `timeout: 10000` e `maxRedirects: 0`.
- [x] Teste confere os dois parâmetros nas duas chamadas.

## F7. `/metrics`

**Critérios de aceite**
- [x] Com `METRICS_TOKEN` definido: sem header, token errado ou de tamanho diferente respondem negado; token certo passa. Comparação com `timingSafeEqual`.
- [x] Sem `METRICS_TOKEN` o endpoint segue aberto, e em produção o boot imprime um aviso.
- [x] `/health` continua público.
- [x] Variável documentada em `.env.example` e em `docs/deploy-gratuito.md`.
- [ ] **Do dono:** definir `METRICS_TOKEN` no Render. Até lá o `/metrics` da demo continua público.
- [ ] Prometheus do compose enviando o token (`authorization.credentials` no `prometheus.yml`), necessário só se o token for definido localmente.

## F8. `trust proxy`

**Critérios de aceite**
- [x] `TRUST_PROXY` (0 a 5, padrão 0) aplicado com `app.set('trust proxy', n)` quando maior que 0.
- [x] Valor inválido (`-1`, `abc`, `1.5`, `9`) derruba o boot com mensagem contendo `TRUST_PROXY`.
- [ ] **Do dono:** definir `TRUST_PROXY` no Render e confirmar na demo qual IP o limitador enxerga. Sem a variável nada muda.

## Como validar

```bash
cd backend
pnpm audit --prod        # sem vulnerabilidades
pnpm lint && pnpm build
pnpm test                # 359 testes
```

Localmente, com um `.env` real, dois testes antigos falham (`constants.spec` de segredos ausentes e `auth.service.spec` de Google não configurado), porque o `dotenv` repovoa as variáveis que o teste apaga. Sem `.env`, como na CI, todos passam. Isso já existia antes deste PR.
