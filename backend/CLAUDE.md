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

### Frontend (`frontend/`, npm)

```bash
npm install
npm run dev               # vite, porta 5173
npm run build             # vite build
npm run lint              # eslint .
npm run preview
```

Não existe suíte de testes no frontend. Verificação após mudanças: `npm run lint` e `npm run build`.

### Portas

- Backend: `4000` (`APP_PORT`, prefixo global `/api`, versionamento URI `v1`)
- Swagger: `http://localhost:4000/api/docs` (só fora de produção)
- Frontend dev: `5173`
- Health: `GET /health` (excluído do prefixo `/api`)
- MongoDB `27017`, Prometheus `9090`, Grafana `3000`

Atenção: o proxy do Vite (`vite.config.js`) aponta `/api` para `http://localhost:8000`, que não bate com a porta `4000` do backend. Ajustar quando for conectar os dois de verdade.

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

`LoggerService` é injetado (módulo `@Global()`), não usar `console.log`. Todo log carrega contexto de módulo/método e descreve evento de negócio:

```ts
const context = { module: 'CreateAuthUserHandler', method: 'execute' };
this.logger.logger(`Starting user registration for email: ${email}`, context);
this.logger.warning(`Registration failed - email already exists: ${email}`, context);
```

### Testes

Convivem com o código em `__test__/` dentro de cada camada, nomeados `*.spec.ts`. E2E fica em `test/*.e2e-spec.ts`. DTOs e interceptors estão fora do coverage (ver `jest.coveragePathIgnorePatterns`).

### Estilo

Aspas simples, ponto e vírgula, Prettier. Import de tipo/interface junto com os demais no topo. Segurança já resolvida no projeto e que deve ser preservada: bcrypt para senha, AES-256-CBC para email em repouso, blind index para consulta, state CSRF no fluxo OAuth. Segredos só via `src/constants.ts`, nunca `process.env` espalhado pelo código.

## Frontend: arquitetura

React 19, Vite, TypeScript, Tailwind v4, TanStack Query, React Router v7, react-i18next.

```
src/
├── api/          # Uma "API façade" por domínio. Hoje devolve mock.
├── mock/         # Dados falsos. Pasta inteira sai quando o backend conectar.
├── hooks/        # Wrappers de TanStack Query em cima de src/api/
├── components/
│   ├── ui/       # Primitivas (Button, Card, Input, Badge, Tabs, Skeleton...)
│   ├── layout/   # AppShell, Sidebar, Topbar, CommandPalette, LanguageSwitcher
│   ├── landing/  # Seções da landing pública
│   ├── auth/, dashboard/, resume/, analysis/, export/
├── context/      # AuthContext, ThemeContext, UIContext (toasts)
├── pages/        # Uma página por rota
├── i18n/         # init + locales/{pt-BR,en}/*.json
├── types/        # api.ts (tipos de resposta), common.ts
└── routes.tsx
```

Alias `@/*` → `src/*` (declarado em `tsconfig.json` e `vite.config.js`). Sempre importar com `@/`.

### Camada de dados: mock ligado

O backend ainda não está conectado. `src/api/client.ts` exporta `apiClient = null` e as chamadas reais em `src/api/*.ts` estão comentadas logo acima da implementação mock correspondente. Ao ligar o backend de verdade, o procedimento documentado no topo de cada arquivo é: descomentar a linha `apiClient.*`, apagar o bloco mock abaixo dela e remover o import de `@/mock/*`.

Enquanto isso, ao adicionar um endpoint mantenha o par: linha real comentada + mock com `await mockDelay()` e o mesmo tipo de retorno de `@/types/api`.

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

Regras: nada de string literal em JSX de página ou componente de feature; toda chave nova entra nos dois idiomas na mesma edição; namespace novo precisa ser adicionado ao import, ao objeto `resources` e ao array `NAMESPACES`. Primitivas de `ui/` continuam genéricas, recebem texto por prop. Conteúdo vindo da API (análise gerada por IA, texto extraído do currículo) fica fora do i18n. Spec completa em `frontend/docs/superpowers/specs/2026-07-29-i18n-design.md`.

**Em texto pt-BR não use travessão (—). Use vírgula, ponto ou dois pontos.**

### Rotas

`src/routes.tsx` com `createBrowserRouter`. Rotas públicas (`/`, `/login`, `/register`) no topo; as autenticadas ficam como filhas de `ProtectedShell`, que checa `useAuth()`, mostra loading e redireciona para `/login` sem usuário. Página nova: criar em `pages/`, registrar como filha do `ProtectedShell` e adicionar o item de navegação em `components/layout/Sidebar.tsx` com a label traduzida no namespace `layout`.

### TypeScript

`strict: false` e `noImplicitAny: false` hoje, com plano de ligar progressivamente (comentário no `tsconfig.json`). Não relaxe mais nada; escreva código novo já tipado, tipos de resposta da API em `src/types/api.ts`.

## Notas gerais

- O `frontend/README.md` ainda é o template padrão do Vite e não descreve o projeto. O `backend/README.md` é detalhado e correto sobre arquitetura, mas ainda cita a URL do repositório original (`CollatzConjecture/nestjs-clean-architecture`), da qual o backend foi derivado.
- Backend usa pnpm, frontend usa npm. Não trocar.
- Não commitar `.env`. Segredos são gerados com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, um valor diferente por chave. `EMAIL_ENCRYPTION_KEY` e `EMAIL_BLIND_INDEX_SECRET` são obrigatórios, a aplicação nem sobe sem eles.
