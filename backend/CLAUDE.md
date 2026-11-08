# CLAUDE.md

Guia para trabalhar neste repositório. Monorepo com dois projetos independentes: `backend/` (NestJS) e `frontend/` (React + Vite). Não há workspace raiz, cada pasta tem seu próprio `package.json`, lockfile e gerenciador.

## Comandos

### Backend (`backend/`, pnpm)

```bash
pnpm install
pnpm run start:dev        # watch mode (tsc -w + nodemon via concurrently)
pnpm run start            # ts-node direto
pnpm run start:prod       # build + node dist/main.js
pnpm run build            # tsc -p tsconfig.build.json
pnpm run lint             # eslint . --ext .ts --max-warnings=0
pnpm run format           # prettier --write "src/**/*.ts"
pnpm run test             # jest (unit, testRegex .spec.ts em src/)
pnpm run test:cov
pnpm run test:e2e         # jest --config ./test/jest-e2e.json
pnpm run docker:dev       # sobe stack completa (api, mongo, prometheus, grafana)
pnpm run docker:logs
pnpm run docker:down
```

Rodar um único teste: `pnpm run test -- src/domain/__test__/profile-domain.service.spec.ts`

### Frontend (`frontend/`, pnpm)

```bash
pnpm install
pnpm dev                  # vite, porta 5173
pnpm build                # vite build
pnpm lint                 # eslint .
pnpm typecheck            # tsc --noEmit
pnpm test                 # vitest run (Testing Library, jsdom)
pnpm preview
```

Verificação após mudanças: `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`, a mesma sequência do CI. Os testes ficam ao lado do código (`*.test.ts(x)`) e `src/test/setup.ts` fixa o idioma em inglês a cada teste.

### Portas

- Backend: `4000` (`APP_PORT`, prefixo global `/api`, versionamento URI `v1`)
- Swagger: `http://localhost:4000/api/docs` (só fora de produção)
- Frontend dev: `5173`
- Health: `GET /health` (excluído do prefixo `/api`)
- MongoDB `27017`, Prometheus `9090`, Grafana `3000`

O proxy do Vite (`vite.config.js`) encaminha `/api` para `http://localhost:4000`, então no dev front e API ficam na mesma origem e CORS não entra. Se algo mais já ocupa a 4000 (outra stack Docker, por exemplo), o dev bate nele sem aviso: confira com `curl localhost:4000/health` e ajuste o `PORT` do backend e o proxy. Para apontar o frontend para uma API em outro host, use `VITE_API_URL` (sem barra no fim e sem `/api/v1`); nesse caso o backend precisa liberar a origem em `CORS_ORIGINS`.

## Backend: arquitetura

Clean Architecture com DDD, CQRS e eventos. Quatro camadas, dependência sempre para dentro (Infrastructure → Application → Domain).

```
src/
├── api/              # Camada HTTP: controllers, DTOs. Sem regra de negócio.
├── application/      # Orquestração: services, commands/handlers, events, sagas, guards, interceptors
├── domain/           # Regra de negócio pura: entities, domain services, interfaces de repositório
└── infrastructure/   # Mongo, models, repositories concretos, logger, health
```

### Regras que não se quebram

- **Domain não importa nada de framework.** Sem `@nestjs/*`, sem Mongoose. `AuthDomainService` e `ProfileDomainService` são classes puras, recebem dados já buscados pela camada de aplicação e devolvem decisão/entidade.
- **Repositórios são invertidos.** Interface em `domain/interfaces/repositories/*.interface.ts`, implementação em `infrastructure/repository/*.repository.ts`, ligação por token string no módulo:
  ```ts
  { provide: 'IAuthRepository', useClass: AuthRepository }
  ```
  E o consumo sempre com `@Inject('IAuthRepository')`.
- **Controller não contém lógica.** Ele chama um application service e formata a saída com `ResponseService`.

### Path aliases

`@api/*`, `@application/*`, `@domain/*`, `@infrastructure/*`, `@constants`. Estão declarados em três lugares e precisam ficar sincronizados ao criar novos: `tsconfig.json` (paths), `package.json` (`jest.moduleNameMapper` e `_moduleAliases`) e `src/main.ts` (`moduleAlias.addAliases`, precisa ser o primeiro código executado). Sempre importar por alias, nunca por caminho relativo longo.

### Padrão de controller

```ts
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(ThrottlerGuard)
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  async register(@Body() dto: RegisterAuthDto) {
    const result = await this.authService.register(dto);
    return this.responseService.created(result, 'User registration initiated successfully');
  }
}
```

Checklist ao adicionar endpoint: `@ApiTags` no controller, `@ApiOperation` e `@ApiResponse` por rota, `@ApiBearerAuth` + `@UseGuards(AuthGuard('jwt'))` quando protegido, `@Throttle` em rotas sensíveis, DTO com `class-validator` (o `ValidationPipe` global usa `whitelist` e `forbidNonWhitelisted`, então campo não declarado no DTO derruba a request com 400).

### Respostas da API

Nunca retornar objeto cru. Usar `ResponseService`: `success`, `created`, `updated`, `deleted`, `retrieved`, `paginated`, e os helpers de erro (`notFound`, `unauthorized`, `badRequest`, `validationError`). Para erro, o normal é lançar a exception do Nest (`NotFoundException`, `ConflictException`) e deixar `ApiExceptionFilter` formatar.

### CQRS e eventos

- Command em `application/<feature>/command/*.command.ts`, handler em `command/handler/*.handler.ts` com `@CommandHandler(X)`.
- Handler novo tem que entrar no array `CommandHandlers` exportado pelo módulo da feature e ser registrado em `providers`.
- Evento em `application/<feature>/events/*.event.ts`, publicado via `eventBus.publish(...)`.
- Fluxos multi-passo vivem em sagas (`application/auth/sagas/registration.saga.ts`), inclusive as transações compensatórias. Exemplo: `AuthUserCreated → CreateProfile`, e no caminho de falha `ProfileCreationFailed → DeleteAuthUser`.

### Logging

`LoggerService` é injetado (módulo `@Global()`), não usar `console.log`. Todo log carrega contexto de módulo/método e descreve evento de negócio. **Nunca logar e-mail, senha ou token**, nem em template string de várias linhas: identifique o usuário pelo `id`.

```ts
const context = { module: 'CreateAuthUserHandler', method: 'execute' };
this.logger.logger('Starting user registration', context);
this.logger.logger(`Auth user created successfully with ID: ${authId}`, context);
```

### Sessão, erros e configuração

- **Refresh token em cookie `httpOnly`** (`refresh_token`, `Path=/api/v1/auth`, `Secure` só em produção, `SameSite` por `COOKIE_SAMESITE`, padrão `lax`, `COOKIE_DOMAIN` opcional). Quem grava e limpa é `api/auth-cookie.ts`. O corpo da resposta só traz `access_token`, e o callback do Google redireciona para `${FRONTEND_URL}/auth/callback` sem token na URL.
- **Refresh token é guardado como SHA-256** (`application/auth/refresh-token-hash.ts`), comparado com `timingSafeEqual` e rotacionado a cada uso: reapresentar um token antigo dá 401. Não use bcrypt para JWT: ele só lê os 72 primeiros bytes, idênticos entre tokens do mesmo usuário, e a rotação deixa de detectar reuso. bcrypt fica só para senha.
- **Regra de negócio violada vira 400**: o domínio lança `DomainValidationError` (`domain/errors/`, sem dependência de framework) e o `ApiExceptionFilter` mapeia para 400. Um `Error` genérico vira 500, então não o use para entrada inválida.
- **Configuração falha no boot**: `JWT_SECRET` e `JWT_REFRESH_SECRET` (mínimo 32 caracteres, sem fallback) e `EMAIL_ENCRYPTION_KEY` (exatamente 64 caracteres hexadecimais, AES-256) são validadas em `src/constants.ts`. Ambientes de teste e CI precisam de valores válidos (`test/setup-unit-env.ts`, `test/setup-e2e.ts`, `.github/workflows/ci.yml`).
- **Camadas verificadas por ESLint**: a regra `no-restricted-imports` em `eslint.config.mjs` barra import que fure a dependência para dentro, sem exceções. Se o lint reclamar, corrija o import, não a regra.

### Testes

Convivem com o código em `__test__/` dentro de cada camada, nomeados `*.spec.ts`. E2E fica em `test/*.e2e-spec.ts`. DTOs e interceptors estão fora do coverage (ver `jest.coveragePathIgnorePatterns`). O CI roda lint, testes e build. Correção de bug entra com teste de regressão, e não se enfraquece assert para fazer teste passar. O `pnpm eval` mede a qualidade da análise com a API do Gemini (use `--dry-run` para não gastar cota); detalhes em `docs/eval.md`.

### Estilo

Aspas simples, ponto e vírgula, Prettier. Import de tipo/interface junto com os demais no topo. Segurança já resolvida no projeto e que deve ser preservada: bcrypt para senha, AES-256-CBC para email em repouso, blind index para consulta, state CSRF no fluxo OAuth, `helmet` e CORS restrito a `CORS_ORIGINS`. Segredos só via `src/constants.ts`, nunca `process.env` espalhado pelo código.

## Frontend: arquitetura

React 19, Vite, TypeScript, Tailwind v4, TanStack Query, React Router v7, react-i18next.

```
src/
├── api/          # Uma "API façade" por domínio, sobre o axios de client.ts.
├── hooks/        # Wrappers de TanStack Query em cima de src/api/
├── components/
│   ├── ui/       # Primitivas (Button, Card, Input, Badge, Tabs, Skeleton...)
│   ├── layout/   # AppShell, Sidebar, Topbar, CommandPalette, LanguageSwitcher
│   ├── landing/  # Seções da landing pública
│   ├── auth/, dashboard/, resume/, analysis/, export/
├── context/      # AuthContext (.ts), ThemeContext, UIContext (toasts) e os módulos theme.ts / ui.ts com contexto e hooks
├── pages/        # Uma página por rota
├── i18n/         # init + locales/{pt-BR,en}/*.json
├── types/        # api.ts (tipos de resposta), common.ts
└── routes.tsx
```

Alias `@/*` → `src/*` (declarado em `tsconfig.json` e `vite.config.js`). Sempre importar com `@/`.

### Camada de dados

`src/api/client.ts` é uma instância real de axios: baseURL `/api/v1` (ou `VITE_API_URL`), `withCredentials` para o cookie, access token só em memória (`tokenStore`, nada de token no `localStorage`), retry de 401 via `/auth/refresh-token` com uma única chamada em voo (single-flight) e um interceptor que desembrulha o envelope `{message, data}` do backend, de modo que a façade lê o payload direto.

As quatro façades (`auth`, `resumes`, `dashboard`, `analytics`) consomem o backend. Não existe mais `src/mock/`, e endpoint novo entra como chamada real, sem par mockado.

Os tipos de `src/types/api.ts` seguem as entidades do backend, chave por chave: identificador é `id`, nunca `_id`, e campo que o backend declara opcional é opcional aqui também. Ao mudar um read model do backend, esse arquivo muda junto na mesma edição. Histórico e pendências da integração em `docs/integracao-frontend-backend.md`.

### Hooks de dados

Toda leitura/escrita passa por um hook em `src/hooks/`, nunca chamar `src/api/*` direto de uma página. O padrão inclui uma key factory:

```ts
export const resumeKeys = {
  all: ["resumes"] as const,
  list: () => [...resumeKeys.all, "list"] as const,
  detail: (id: string) => [...resumeKeys.all, "detail", id] as const,
};

export function useUploadResume() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) => resumesApi.upload(file, title),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: resumeKeys.list() });
      toast.success("Resume uploaded", `${data?.resume?.title} · parsed and ready as V1`);
    },
    onError: (e: ApiError) => toast.error("Upload failed", e?.message),
  });
}
```

Mutation sempre invalida as queries afetadas e dispara toast de sucesso e de erro via `useToast()` do `UIContext`.

### Componentes

Primitivas de `ui/` usam `cva` para variantes, `cn()` de `@/lib/utils` para merge de classes e `forwardRef` com `displayName`:

```tsx
const buttonVariants = cva("inline-flex items-center ...", {
  variants: { variant: { primary: "...", accent: "..." }, size: { sm: "...", md: "..." } },
  defaultVariants: { variant: "primary", size: "md" },
});
```

Páginas são `export default`, componentes são named export. Ícones vêm de `lucide-react`.

### Estilo visual

Tailwind v4 com tokens CSS em `src/index.css` (`@theme inline` + blocos `:root` / `[data-theme="dark"]`, cores em `oklch`). Cor no JSX se escreve como `bg-[var(--card)]`, `text-[var(--muted-foreground)]`, `border-[var(--border)]`. Não hardcodar hex nem usar cores nominais do Tailwind (`bg-slate-800`), senão o tema escuro quebra. Novo token entra no `index.css`, nos dois temas.

### i18n

`pt-BR` é o idioma padrão e o fallback; `en` é espelho. Namespaces carregados de forma eager em `src/i18n/index.ts`: `common`, `landing`, `auth`, `layout`, `dashboard`, `resumes`, `analysis`, `insights`, `settings`.

```tsx
const { t } = useTranslation("resumes");
<PageHeader title={t("list.title")} description={t("list.desc")} />
```

Regras: nada de string literal em JSX de página ou componente de feature; toda chave nova entra nos dois idiomas na mesma edição; namespace novo precisa ser adicionado ao import, ao objeto `resources` e ao array `NAMESPACES`. Primitivas de `ui/` continuam genéricas, recebem texto por prop. Conteúdo vindo da API (análise gerada por IA, texto extraído do currículo) fica fora do i18n.

**Em texto pt-BR não use travessão (—). Use vírgula, ponto ou dois pontos.**

### Rotas

`src/routes.tsx` com `createBrowserRouter`. Rotas públicas (`/`, `/login`, `/register`, `/auth/callback`) no topo; as autenticadas ficam como filhas de `ProtectedShell`, que checa `useAuth()`, mostra loading e redireciona para `/login` sem usuário. Página nova: criar em `pages/`, registrar como filha do `ProtectedShell` e adicionar o item de navegação em `components/layout/Sidebar.tsx` com a label traduzida no namespace `layout`.

### TypeScript

`strict: false` e `noImplicitAny: false` hoje, com plano de ligar progressivamente (comentário no `tsconfig.json`). Não relaxe mais nada; escreva código novo já tipado, tipos de resposta da API em `src/types/api.ts`.

## Notas gerais

- O `README.md` da raiz, o `backend/README.md` e o `frontend/README.md` descrevem o projeto atual. O do backend cita o `nestjs-clean-architecture` só como inspiração da estrutura.
- Backend e frontend usam pnpm (lockfiles `pnpm-lock.yaml`). Não trocar.
- Login com Google: o botão (`components/auth/GoogleSignIn.tsx`) é um link para `/api/v1/auth/google`, porque o backend responde com redirect. Precisa de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALLBACK_URL`.
- Front e API em domínios diferentes exigem `COOKIE_SAMESITE=none` com HTTPS. O caminho recomendado é subdomínios do mesmo domínio com `COOKIE_DOMAIN` e `lax`.
- Não commitar `.env`. Segredos são gerados com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, um valor diferente por chave. `EMAIL_ENCRYPTION_KEY` (64 hex, o comando acima já gera isso) e `EMAIL_BLIND_INDEX_SECRET` são obrigatórios, junto com `JWT_SECRET` e `JWT_REFRESH_SECRET`: a aplicação nem sobe sem eles.
