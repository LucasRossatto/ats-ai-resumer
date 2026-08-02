# Integração Frontend x Backend

Levantamento completo do que falta para desligar os mocks do frontend e consumir o backend de verdade. Serve como plano de implementação: cada seção traz o estado atual, o que precisa mudar e onde.

Data do levantamento: 2026-08-01
Branch analisada: `dev`

---

## Sumário

1. [Estado atual](#1-estado-atual)
2. [Resumo executivo](#2-resumo-executivo)
3. [Fase 0: fundação](#3-fase-0-fundação)
4. [Fase 1: autenticação](#4-fase-1-autenticação)
5. [Fase 2: endpoints faltando](#5-fase-2-endpoints-faltando)
6. [Fase 3: rotas com nome divergente](#6-fase-3-rotas-com-nome-divergente)
7. [Fase 4: divergências de contrato campo a campo](#7-fase-4-divergências-de-contrato-campo-a-campo)
8. [Fase 5: lacunas de feature](#8-fase-5-lacunas-de-feature)
9. [Checklist de execução](#9-checklist-de-execução)
10. [Anexo A: mapa completo rota a rota](#anexo-a-mapa-completo-rota-a-rota)

---

## 1. Estado atual

### Frontend

Está 100% mockado. `frontend/src/api/client.ts` exporta `apiClient = null` e as 20 chamadas HTTP reais estão comentadas logo acima da implementação mock correspondente em `frontend/src/api/*.ts`.

Arquivos envolvidos:

| Arquivo | Chamadas | Mock consumido |
|---|---|---|
| `src/api/auth.ts` | 6 | `src/mock/auth.ts` |
| `src/api/resumes.ts` | 10 | `src/mock/resumes.ts` |
| `src/api/dashboard.ts` | 1 | `src/mock/dashboard.ts` |
| `src/api/analytics.ts` | 3 | `src/mock/analytics.ts` |

Tipos esperados pelo front vivem em `src/types/api.ts`. É esse arquivo que define o contrato do lado do cliente e é ele que precisa ser reconciliado com as entidades de domínio do backend.

### Backend

Oito controllers registrados em `src/api/api.module.ts`:

`AuthController`, `ProfileController`, `HelloController`, `UploadController`, `ResumeController`, `AnalysisController`, `DashboardController`, `InsightsController`.

Prefixo global `api` (`API_BASE_PATH` em `src/constants.ts`) e versionamento por URI com default `1` (`src/main.ts`). Toda rota, portanto, vive em `/api/v1/...`, exceto `/health`, que é excluída do prefixo.

---

## 2. Resumo executivo

De 20 chamadas do frontend:

- **13 têm endpoint correspondente** no backend, mas nenhuma delas funciona sem ajuste de contrato.
- **3 não existem** e precisam ser criadas: `GET /auth/me`, `GET /versions`, `GET /history`.
- **2 existem em outro path ou verbo**: atualização de perfil e troca de senha.
- **2 existem com nome de rota diferente**: `analyze` e `analyses`.

Além disso há quatro bloqueadores transversais que afetam todas as chamadas ao mesmo tempo:

1. Base URL divergente (`/api` no front, `/api/v1` no backend) e proxy do Vite apontando para a porta errada.
2. Envelope de resposta (`{message, data, ...}`) que o front não desembrulha.
3. Modelo de autenticação incompatível (cookie no front, Bearer + refresh no backend).
4. Identificador `_id` no front contra `id` no backend, em todas as entidades.

Ordem recomendada: fundação, autenticação, endpoints faltando, nomes de rota, shapes, features.

---

## 3. Fase 0: fundação

Nada mais funciona antes disso. São quatro itens.

### 3.1 Base URL e proxy

**Problema.** `src/api/client.ts` está com `baseURL: "/api"`. O backend serve em `/api/v1`. E `frontend/vite.config.js` faz proxy de `/api` para `http://localhost:8000`, enquanto o backend sobe na `4000` (`APP_PORT` em `backend/src/constants.ts`).

**Correção.**

`frontend/vite.config.js`:

```js
server: {
  port: 5173,
  proxy: {
    "/api": {
      target: "http://localhost:4000",
      changeOrigin: true,
    },
  },
},
```

`frontend/src/api/client.ts`:

```ts
baseURL: import.meta.env.VITE_API_URL || "/api/v1",
```

Criar `frontend/.env.example` documentando `VITE_API_URL`. Hoje o frontend não tem `.env` nenhum.

**Observação sobre CORS.** O backend não chama `app.enableCors()` em `src/main.ts`. Em desenvolvimento isso não aparece porque o proxy do Vite faz a requisição same origin. Ao publicar o front em outro domínio, vai quebrar. Ou habilita CORS no backend, ou mantém o front atrás do mesmo host.

### 3.2 Envelope de resposta

**Problema.** Todo controller retorna via `ResponseService`, e ainda existe um `ResponseInterceptor` global registrado em `src/app.module.ts` (`APP_INTERCEPTOR`). O corpo real de qualquer 200 é:

```json
{
  "message": "Resumes retrieved successfully",
  "data": [ ... ],
  "timestamp": "2026-08-01T12:00:00.000Z",
  "path": "/api/v1/resumes",
  "method": "GET"
}
```

O frontend espera o objeto direto, e além disso espera chaves nomeadas que o backend não usa. Exemplo, `resumesApi.list()` faz `.then((d) => d.resumes)`, mas o backend devolve o array cru dentro de `data`.

**Correção.** Duas mudanças combinadas.

Primeiro, um interceptor de response no axios que desembrulha:

```ts
apiClient.interceptors.response.use(
  (res) => {
    // Todo endpoint responde no envelope { message, data, ... }.
    // O resto do app trabalha só com o payload.
    res.data = res.data?.data ?? res.data;
    return res;
  },
  (err) => { /* ver 3.3 */ }
);
```

Segundo, ajustar cada façade em `src/api/*.ts` para parar de esperar a chave nomeada. As assinaturas de retorno em `src/types/api.ts` que precisam sumir ou mudar:

| Envelope atual no front | Depois |
|---|---|
| `ResumesListResponse { resumes }` | `ResumeShallow[]` |
| `ResumeGetResponse { resume, versions }` | mantém, o backend devolve `{resume, versions}` em `data` |
| `ResumeVersionResponse { version }` | `ResumeVersion` |
| `ResumeUploadResponse { resume }` | `{resume, version, meta}` (ver 7.2) |
| `AnalysisResponse { analysis }` | `Analysis` |
| `AnalysesResponse { analyses }` | `Analysis[]` |
| `RewriteResponse { version, appliedCount }` | mantém, o backend devolve exatamente isso |
| `DiffResponse { hunks }` | `{from, to, parts, stats}` (ver 7.4) |

Os hooks em `src/hooks/useResumes.ts` que fazem `.then((d) => d.resumes)` e similares precisam acompanhar.

### 3.3 Formato de erro

**Problema.** O interceptor comentado no front lê `err.response?.data?.error?.message`. O `ErrorResponseDto` do backend (`src/api/dto/common/api-response.dto.ts`) coloca a mensagem no topo e reserva `error` para `{code, details}`:

```json
{
  "message": "Resume not found",
  "error": { "code": "NOT_FOUND", "details": null },
  "timestamp": "...",
  "path": "...",
  "method": "..."
}
```

Ou seja, `error.message` é sempre `undefined` e todo toast de erro cairia no fallback genérico.

**Correção.** No interceptor de erro do axios:

```ts
(err) => {
  const body = err.response?.data;
  return Promise.reject({
    status: err.response?.status,
    message: body?.message || err.message || "Request failed",
    code: body?.error?.code,
    details: body?.error?.details,
    original: err,
  });
}
```

Atualizar `ApiError` em `src/types/common.ts` para incluir `code`.

### 3.4 Identificador `id` contra `_id`

**Problema.** Todas as entidades do backend expõem `id` (`Resume`, `ResumeVersion`, `Analysis`, `Profile`, `AuthUser`). Todos os tipos do front usam `_id` (`User._id`, `Resume._id`, `ResumeVersion._id`, `Analysis._id`, `BulletRewrite._id`).

Detalhe: os itens de lista do dashboard e analytics já usam `id` no front (`VersionStackItem.id`, `ActivityItem.id`, `VersionsListItem.id`, `HistoryEvent.id`). A inconsistência é só nas entidades principais.

**Correção.** Renomear `_id` para `id` em `src/types/api.ts` e propagar. Ocorrências a ajustar:

- `src/types/api.ts`: `User`, `ResumeVersion`, `Resume`, `Analysis`, `BulletRewrite` e os tipos derivados `ResumeShallow` e `ResumeSummary`.
- `src/mock/*.ts`: a pasta inteira será deletada ao final, mas enquanto os mocks coexistirem precisa acompanhar para o build passar.
- Componentes que leem `_id`: `ResumeRow`, `VersionSwitcher`, `BulletRewrites`, páginas `Resumes`, `ResumeDetail`, `Export`.

Fazer isso via renomeação global de `._id` para `.id` e revisar caso a caso, é mais rápido que mapear por entidade.

---

## 4. Fase 1: autenticação

O maior bloco de trabalho. O front foi escrito assumindo sessão por cookie, o backend implementa JWT Bearer com refresh token.

### 4.1 O que o backend oferece hoje

| Rota | Retorno |
|---|---|
| `POST /api/v1/auth/register` | `{message, authId, profileId, access_token, refresh_token, profile: {id, name, age}}` |
| `POST /api/v1/auth/login` | `{access_token, refresh_token, profile: {id, name, age}}` |
| `POST /api/v1/auth/logout` | `{message}`, exige Bearer |
| `POST /api/v1/auth/refresh-token` | `{access_token, ...}`, body `{refresh_token}` |
| `POST /api/v1/auth/change-password` | `{message}`, body `{oldPassword, newPassword}`, exige Bearer |
| `GET /api/v1/auth/google` | redirect OAuth |
| `GET /api/v1/auth/google/redirect` | callback OAuth |
| `GET /api/v1/auth/:id` | perfil por auth id, exige Bearer |
| `DELETE /api/v1/auth/:id` | remove auth e profile, exige Bearer |
| `PUT /api/v1/profile/me` | atualiza o próprio perfil, body `{name?, lastname?, age?}` |

O payload do JWT é `{sub, email, roles}` e a `JwtStrategy` (`src/application/auth/jwt.strategy.ts`) devolve `{id: payload.sub, email, roles}` em `req.user`. O decorator `@CurrentUserId()` extrai `req.user.id`, que é o **auth id**, não o profile id. Isso importa: os currículos são gravados com `userId = authId`.

### 4.2 `GET /auth/me` não existe

**Impacto.** Bloqueador crítico. `AuthContext.refresh()` chama `authApi.me()` no boot e o `ProtectedShell` fica em loading até essa promise resolver. Sem esse endpoint o app não sai da tela inicial.

O `GET /auth/:id` existente não resolve: o front não tem o id antes de ter o usuário. Decodificar o JWT no cliente para extrair o `sub` e chamar `/auth/:id` funciona, mas é gambiarra, e o endpoint devolve a entidade `AuthUser` completa, com `password` e `currentHashedRefreshToken`, o que não deve trafegar.

**Implementação sugerida no backend.**

`src/application/services/auth.service.ts`, novo método:

```ts
async getMe(userId: string): Promise<AuthenticatedUser> {
  const auth = await this.authRepository.findById(userId);
  if (!auth) throw new NotFoundException('User not found');

  const profile = await this.profileRepository.findByAuthId(auth.id);

  return {
    id: auth.id,
    email: auth.email,
    name: profile?.name ?? null,
    lastname: profile?.lastname ?? null,
    roles: auth.role,
    createdAt: auth.createdAt,
  };
}
```

`src/api/controllers/auth.controller.ts`, nova rota. Atenção à ordem: precisa ser declarada **antes** de `@Get(':id')`, senão o Nest casa `me` como parâmetro de rota.

```ts
@UseGuards(AuthGuard('jwt'))
@Get('me')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get the authenticated user' })
@ApiResponse({ status: 200, description: 'Returns the current user.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
async me(@CurrentUserId() userId: string) {
  const user = await this.authService.getMe(userId);
  return this.responseService.retrieved(user, 'User retrieved successfully');
}
```

Criar a interface `AuthenticatedUser` em `src/domain/entities/Auth.ts` ou num DTO de resposta. Nunca devolver a entidade `AuthUser` crua.

**Nota sobre o email.** O email fica criptografado em repouso (AES-256-CBC, com blind index para consulta). Confirmar que `authRepository.findById` já devolve descriptografado antes de assumir que `auth.email` serve para exibição.

### 4.3 Fluxo de token no frontend

**O que falta.** Tudo. Hoje não existe nem armazenamento nem header.

Implementar em `src/api/client.ts`:

```ts
// Armazenamento. localStorage sobrevive a reload, que é o comportamento
// que o AuthContext assume ao chamar me() no boot.
const TOKEN_KEY = "ats.access_token";
const REFRESH_KEY = "ats.refresh_token";

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

E o retry no 401, com guarda contra loop e fila para requisições concorrentes:

```ts
// No interceptor de erro: um 401 tenta o refresh uma única vez.
// Falhou o refresh, limpa a sessão e deixa o AuthContext redirecionar.
```

Pontos de atenção:

- Não tentar refresh quando a própria chamada que falhou for `/auth/refresh-token` ou `/auth/login`.
- Requisições concorrentes que tomem 401 juntas devem esperar um único refresh, não disparar N.
- `authApi.logout()` precisa limpar as duas chaves do storage, independente da resposta do backend.
- Decidir sobre `withCredentials`. Com Bearer não é necessário. O único uso de cookie no backend é `oauth_state`, no fluxo Google, que é server side.

### 4.4 Register e login: payload e retorno

**Problema no register.** `RegisterAuthDto` exige cinco campos obrigatórios: `name`, `lastname`, `age`, `email`, `password`. A página `src/pages/Register.tsx` monta o form com três: `{name, email, password}`.

Com `ValidationPipe({whitelist: true, forbidNonWhitelisted: true})` global, faltar `lastname` e `age` derruba a request com 400.

Duas saídas:

- **A (recomendada).** Tornar `lastname` e `age` opcionais no DTO com `@IsOptional()`. O produto é um analisador de currículo, idade não é dado necessário no cadastro.
- **B.** Adicionar os campos ao formulário de registro. Aumenta atrito no cadastro sem ganho claro.

**Problema no retorno.** `AuthContext` espera `{user}` com `{id, name, email, createdAt}` em login e register. O backend devolve `{access_token, refresh_token, profile: {id, name, age}}`. Falta o email, falta `createdAt`, e o `profile.id` é o profile id, não o auth id que identifica o dono dos currículos.

**Correção.** Padronizar o retorno de `login` e `register` para:

```ts
{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;        // authId, o mesmo que @CurrentUserId() devolve
    email: string;
    name: string | null;
    lastname: string | null;
    createdAt: Date;
  };
}
```

Mesmo shape do `GET /auth/me`, para o front ter um único tipo `User`. Ajustar `authApi.login` e `authApi.register` para gravar os tokens e devolver `{user}`.

### 4.5 Atualização de perfil

**Problema.** Front chama `PATCH /auth/profile` com `Partial<User>`, que inclui `email`. Backend tem `PUT /api/v1/profile/me` com `UpdateProfileDto` aceitando só `{name?, lastname?, age?}`. Enviar `email` derruba com 400 por causa do `forbidNonWhitelisted`.

Hoje o único campo que a tela `Settings.tsx` edita é `name`, e o campo de email já está `disabled`. Então o conflito é só de path, verbo e de tipagem larga demais.

**Correção no front,** `src/api/auth.ts`:

```ts
updateProfile: (payload: { name?: string; lastname?: string }) =>
  apiClient.put("/profile/me", payload).then((r) => r.data),
```

Estreitar a assinatura de `updateProfile` no `AuthContext` de `Partial<User>` para `{name?, lastname?}`, senão o TypeScript continua deixando passar `email`.

**Detalhe.** `PUT /profile/me` devolve a entidade `Profile` (`{id, authId, name, lastname, age}`), não o `User` que o `AuthContext` guarda no estado. Ou o backend passa a devolver o mesmo shape de `/auth/me`, ou o front faz merge do que voltou com o usuário atual. Preferir o primeiro, evita duas fontes de verdade.

### 4.6 Troca de senha

**Problema.** Front chama `PATCH /auth/password` com `{currentPassword, newPassword}`. Backend tem `POST /api/v1/auth/change-password` com `{oldPassword, newPassword}`.

**Correção no front,** `src/api/auth.ts`:

```ts
changePassword: (payload: { oldPassword: string; newPassword: string }) =>
  apiClient.post("/auth/change-password", payload).then((r) => r.data),
```

E em `src/pages/Settings.tsx`, `PasswordSection`, renomear o estado `currentPassword` na chamada:

```ts
await authApi.changePassword({ oldPassword: currentPassword, newPassword });
```

**Efeito colateral.** `changePassword` no backend zera `currentHashedRefreshToken`. O refresh token guardado no front deixa de valer na hora. Ou o front força logout depois de trocar a senha, ou o backend devolve tokens novos. Forçar logout é o comportamento mais previsível e é o que a maioria dos produtos faz.

---

## 5. Fase 2: endpoints faltando

Dois endpoints de agregação cruzando todos os currículos do usuário. Ambos alimentam páginas que hoje existem e estão completas no front.

### 5.1 `GET /api/v1/versions`

**Consumidor.** `src/pages/Versions.tsx` via `useAllVersions()` em `src/hooks/useAnalytics.ts`.

**Contrato esperado pelo front** (`AllVersions` em `src/types/api.ts`):

```ts
{
  totals: { all: number; uploads: number; rewrites: number };
  versions: Array<{
    id: string;
    label: string;          // "V1", "V2"
    resumeId: string;
    resumeTitle: string;
    sourceType: "upload" | "rewrite";
    score: number | null;   // a UI já trata null com badge "sem score"
    createdAt: string;      // ISO
  }>;
}
```

A página ordena por data decrescente, filtra por `sourceType` e busca por `resumeTitle` ou `label`, tudo client side. O backend só precisa devolver a lista completa ordenada.

**Implementação.** Seguir a arquitetura já usada em `InsightsService` e `DashboardService`.

1. **Repositório.** `IResumeVersionRepository` já tem `findRecentByResumeIds(resumeIds, limit)`. Falta a versão sem limite. Adicionar em `src/domain/interfaces/repositories/resume-version-repository.interface.ts`:

```ts
/**
 * Todas as versões de um conjunto de currículos, mais novas primeiro. A página
 * de versões agrega sobre o histórico inteiro, não sobre um recorte.
 */
findAllByResumeIds(resumeIds: string[]): Promise<ResumeVersion[]>;
```

Implementar em `src/infrastructure/repository/resume-version.repository.ts`. Não projetar `rawText` nem `parsedSections`, o payload não precisa e são os dois campos pesados.

2. **Score.** `ResumeVersion` não guarda score, só `latestAnalysisId`. Resolver com `analysisRepository.findStatsByIds(ids)`, que já existe exatamente para isso, e montar um `Map<versionId, atsScore>`. Versão sem análise fica com `score: null`.

3. **Domain service.** Criar `src/domain/services/history-domain.service.ts` (compartilhado com o `/history` da próxima seção) com o método de montagem e a contagem dos totais. Classe pura, sem import de framework, recebendo os dados já buscados.

4. **Application service.** `src/application/services/history.service.ts`, método `getAllVersions(userId)`. Busca resumes do usuário, versões desses resumes, stats das análises, e delega a montagem ao domain service.

5. **Controller.** `src/api/controllers/versions.controller.ts`, path `versions`, versão `1`, com `AuthGuard('jwt')`, `ThrottlerGuard`, `LoggingInterceptor`, `@ApiTags('versions')` e `@ApiBearerAuth()`. Registrar em `src/api/api.module.ts`.

6. **Módulo.** `src/application/history/history.module.ts` no padrão dos módulos existentes, importado pelo `ApplicationModule`.

7. **Testes.** `src/domain/__test__/history-domain.service.spec.ts` e `src/application/__test__/history.service.spec.ts`, espelhando o que já existe para dashboard e insights.

**Entidade de domínio.** Criar `src/domain/entities/History.ts`:

```ts
export interface VersionListItem {
  id: string;
  label: string;
  resumeId: string;
  resumeTitle: string;
  sourceType: ResumeVersionSourceType;
  score: number | null;
  createdAt?: Date;
}

export interface VersionsTotals {
  all: number;
  uploads: number;
  rewrites: number;
}

export interface VersionsOverview {
  totals: VersionsTotals;
  versions: VersionListItem[];
}
```

### 5.2 `GET /api/v1/history`

**Consumidor.** `src/pages/History.tsx` via `useHistory()`.

**Contrato esperado pelo front** (`History` em `src/types/api.ts`):

```ts
{
  totals: { all: number; upload: number; analyze: number; rewrite: number };
  events: Array<{
    id: string;
    type: "upload" | "analyze" | "rewrite";
    title: string;
    subtitle: string;
    label: string;     // badge, ex: "V2" ou "ATS 86"
    at: string;        // ISO
    resumeId: string;
  }>;
}
```

A página agrupa por dia, filtra por tipo e usa `totals[filtro]` no contador de cada aba. Ordem cronológica decrescente.

**Implementação.** O `DashboardService` já monta algo muito parecido em `activity`, mas com `ACTIVITY_LIMIT = 8` e sem os totais por tipo. Duas opções:

- **A (recomendada).** Extrair a construção do feed do `DashboardDomainService` para o `HistoryDomainService`, parametrizando o limite. O dashboard passa a chamar com `limit: 8`, o `/history` chama sem limite. Elimina duplicação e garante que as duas telas nunca divirjam.
- **B.** Duplicar a lógica no `HistoryService`. Mais rápido de escrever, mas cria duas fontes de verdade para o mesmo feed.

Fontes dos eventos:
- `upload`: versões com `sourceType: 'upload'`.
- `rewrite`: versões com `sourceType: 'rewrite'`.
- `analyze`: análises, via `analysisRepository.findStatsByUserId(userId, limit)`. Para o histórico completo vai faltar um método sem limite, ou reusar `findInsightsByUserId`, que já traz tudo, ordenado do mais antigo para o mais novo, e inverter.

**Atenção ao nome do tipo.** O backend usa `'analysis'` em `ActivityType` (`src/domain/entities/Dashboard.ts`), o front usa `'analyze'`. Ver seção 7.5. Definir o valor **antes** de implementar, para os dois endpoints saírem já alinhados.

---

## 6. Fase 3: rotas com nome divergente

Duas rotas onde o único problema é o nome. Corrigir no backend é mais barato: são duas linhas, contra várias ocorrências espalhadas em façades, hooks e keys do front.

### 6.1 `analyzer` para `analyze`

`src/api/controllers/analysis.controller.ts`, linha 41:

```diff
- @Post(':id/analyzer')
+ @Post(':id/analyze')
```

`analyzer` é substantivo, o endpoint é uma ação. `analyze` também é o que o front já espera.

### 6.2 `analysis` para `analyses`

`src/api/controllers/analysis.controller.ts`, linha 65:

```diff
- @Get(':id/analysis')
+ @Get(':id/analyses')
```

O endpoint devolve uma coleção, o plural é o correto e evita ambiguidade com `GET /:id/versions/:versionId/analysis`, que devolve uma única análise e permanece no singular.

Atualizar o `test/app.e2e-spec.ts` se ele exercitar esses paths.

---

## 7. Fase 4: divergências de contrato campo a campo

Aqui está o grosso do trabalho depois da autenticação. Cada subseção compara o que o backend produz com o que o front consome, e propõe o lado que deve ceder.

Princípio geral adotado: **o backend é a fonte de verdade do domínio, o front se adapta**, exceto quando o front precisa de um dado agregado que o backend simplesmente não tem. Nesses casos o backend ganha o campo.

### 7.1 `Resume`: faltam `bestScore` e `versionCount`

| Front (`Resume`) | Backend (`Resume`) |
|---|---|
| `_id` | `id` |
| `title` | `title` |
| `createdAt` | `createdAt?` |
| `updatedAt` | `updatedAt?` |
| `currentVersionId` | `currentVersionId?` |
| `bestScore` | não existe |
| `versionCount` | `latestVersionNumber` |
| `versions[]` | não vem em `GET /resumes` |

`bestScore` e `versionCount` são usados na lista de currículos (`src/pages/Resumes.tsx` e `ResumeRow`).

**Correção.** `latestVersionNumber` serve como `versionCount` desde que nenhuma versão seja deletada. Como não há delete de versão hoje, dá para mapear direto no front.

`bestScore` precisa vir do backend. Criar um read model em `GET /api/v1/resumes`:

```ts
export interface ResumeListItem {
  id: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  currentVersionId?: string | null;
  latestVersionNumber: number;
  bestScore: number | null;
}
```

O `ResumeService.findAllByUser` passa a cruzar com `analysisRepository` para o melhor score por currículo. `findInsightsByUserId` já traz `resumeId` e `atsScore` de todo o histórico, dá para derivar sem query nova.

Devolver `null` quando o currículo nunca foi analisado, e tratar esse caso na UI. Zero leria como nota ruim, não como ausência de dado.

### 7.2 `ResumeVersion`: falta `score`

| Front | Backend |
|---|---|
| `_id` | `id` |
| `label` | `label` |
| `sourceType` | `sourceType` |
| `createdAt` | `createdAt?` |
| `score` | não existe, vive em `Analysis` |
| `rawText` | `rawText?` |
| `parsedSections` | `parsedSections?` |
| não tem | `resumeId`, `versionNumber`, `parentVersionId`, `latestAnalysisId` |

`version.score` é lido em `VersionSwitcher`, `VersionStack` e na página de detalhe.

**Correção.** Mesma estratégia da 7.1: enriquecer o read model de `GET /resumes/:id` com o score derivado de `latestAnalysisId` via `findStatsByIds`. Não adicionar `score` como coluna na entidade `ResumeVersion`, seria duplicar estado que já pertence a `Analysis`.

**Sobre `parsedSections`.** Todos os campos são opcionais no backend e obrigatórios no front (`ParsedSections` em `src/types/api.ts`). Como o parse é feito por IA e pode falhar parcialmente, o backend está certo. Tornar tudo opcional no front e revisar os consumidores, principalmente `src/components/export/ResumeDocument.tsx`, que renderiza o currículo inteiro e vai quebrar em seção ausente.

Diferenças pontuais dentro de `ParsedSections`:

| Campo | Front | Backend |
|---|---|---|
| `experience[].location` | não tem | tem |
| `education[].details` | não tem | tem |
| `projects[].summary` | `summary` | `description` |
| `projects[].links` | não tem | tem |
| `certifications[].year` | `number` | `string` |
| `certifications[].issuer` | não tem | tem |

`projects[].summary` contra `description` e `certifications[].year` como número contra string são quebras silenciosas: o campo simplesmente vem vazio ou o formato não bate. Alinhar pelo backend.

### 7.3 `Analysis`

| Front | Backend | Ação |
|---|---|---|
| `_id` | `id` | renomear no front |
| `versionId` | `versionId` | ok |
| `atsScore` | `atsScore` | ok |
| `model` | `model` | ok |
| `summary` | `summary?` | tornar opcional no front |
| `scoreBreakdown: [{label, value}]` | `{keywords?, formatting?, impact?, clarity?}` | ver abaixo |
| `issues: [{title, severity, fix}]` | `[{title, severity?, explanation?, fix?}]` | tornar opcionais, aproveitar `explanation` |
| `strengths: [{title, note}]` | `[{title, evidence?}]` | renomear `note` para `evidence` no front |
| `keywordsPresent` | `keywordsPresent?` | opcional |
| `keywordsMissing` | `keywordsMissing?` | opcional |
| `bulletRewrites` | `bulletRewrites?` | ver 8.1 |
| não tem | `resumeId`, `userId`, `promptTokens`, `createdAt` | adicionar `resumeId` e `createdAt` no front, os outros ignorar |

**`scoreBreakdown` é a divergência estrutural.** O front espera um array de `{label, value}` e itera para desenhar as barras em `src/components/analysis/ScoreBreakdown.tsx`. O backend devolve um objeto de chaves fixas.

Recomendação: manter o objeto no backend, ele é mais fiel ao domínio (as quatro dimensões são fixas, não uma lista arbitrária) e converter no front, com o label vindo do i18n:

```ts
const BREAKDOWN_KEYS = ["keywords", "formatting", "impact", "clarity"] as const;

const items = BREAKDOWN_KEYS
  .filter((k) => analysis.scoreBreakdown?.[k] != null)
  .map((k) => ({ key: k, label: t(`breakdown.${k}`), value: analysis.scoreBreakdown[k] }));
```

Isso resolve de quebra um problema que existe hoje: o `label` vem do backend em inglês e escapa do i18n. Adicionar as quatro chaves em `src/i18n/locales/pt-BR/analysis.json` e `en/analysis.json`.

### 7.4 Diff

| Front (`DiffResponse`) | Backend (`VersionDiff`) |
|---|---|
| `hunks: [{type: "add"\|"remove"\|"context", text}]` | `parts: [{value, added, removed}]` |
| não tem | `from: {id, label, versionNumber}` |
| não tem | `to: {id, label, versionNumber}` |
| não tem | `stats: {added, removed}` |

**Correção.** Adaptar no front, em `src/api/resumes.ts`, mantendo `DiffView` intocado:

```ts
diff: (id, from, to, mode = "words") =>
  apiClient
    .get(`/resumes/${id}/diff`, { params: { from, to, mode } })
    .then((r) => ({
      ...r.data,
      hunks: r.data.parts.map((p) => ({
        type: p.added ? "add" : p.removed ? "remove" : "context",
        text: p.value,
      })),
    })),
```

`stats` é um ganho: dá para mostrar "+12 adições, -8 remoções" no cabeçalho do `DiffView` sem contar no cliente.

`mode` aceita `'words' | 'chars' | 'lines' | 'sentences'` no backend (`DiffService`). O front só usa `'words'`. Tipar o parâmetro com a união completa em vez de `string`.

### 7.5 Dashboard

Comparação entre `Dashboard` (`src/types/api.ts`) e `DashboardOverview` (`src/domain/entities/Dashboard.ts`):

| Caminho | Front | Backend | Ação |
|---|---|---|---|
| `totals` | `{resumes, rewrites, analyses}` | `{resumes, rewrites, analyses, exports}` | adicionar `exports` no front ou ignorar |
| `latestResume` | `{_id, title}` | `{id, title, latestVersionNumber, currentVersionId, updatedAt}` ou `null` | front precisa tratar `null` |
| `scoreSeries[]` | `{label, score}` | `{versionId, label, score, createdAt}` | ok, front ignora os extras |
| `versionStack[]` | `{id, label, title, score}` | `{id, label, title, score, delta}` | usar `delta`, o front hoje calcula |
| `kpi.atsScore` | `{value, delta?, spark}` | `{value: number\|null, delta: number\|null, spark}` | tratar `null` |
| `kpi.versions` | idem | idem | tratar `null` |
| `kpi.issuesIdentified` | `{value, delta?, spark}` | `kpi.issues` | **renomear** |
| `kpi.keywordsMatched` | `{value, delta?, spark, total}` | `kpi.keywords`, sem `total` | **renomear**, e decidir sobre `total` |
| `kpi.*.spark[]` | `{v: number}` | `{value: number}` | **alinhar**, usar `value` |
| `activity[].at` | `at` | `createdAt` | **alinhar** |
| `activity[].type` | `"analyze"` | `"analysis"` | **alinhar** |

Três quebras silenciosas para tratar com prioridade, porque não geram erro, só renderizam vazio: `kpi.issues` contra `issuesIdentified`, `spark[].v` contra `value`, e `activity[].at` contra `createdAt`.

**Sobre `keywordsMatched.total`.** O front mostra "42 de 60 keywords". O backend só devolve o número absoluto. Ou o `DashboardDomainService` passa a calcular `keywordsPresent + keywordsMissing` como total (o `AnalysisStat` já carrega os dois contadores), ou o card muda para mostrar só o absoluto. Calcular no backend é melhor, o dado já está na mão.

**Sobre `totals.exports`.** O backend conta exports mas o front não tem tela de export rastreada, `src/pages/Export.tsx` gera PDF no cliente sem avisar o servidor. Verificar de onde o backend tira esse número. Se for sempre zero, remover do contrato até existir a feature.

**Sobre `activity[].type`.** Escolher `'analysis'` (backend, substantivo, consistente com `upload` e `rewrite` que também são substantivos) e ajustar o front em `ActivityFeed`, `History.tsx` (`ICONS`, `TONES`, `FILTERS`) e `src/types/api.ts`. Alinhar junto com o `/history` da seção 5.2.

### 7.6 Insights

Comparação entre `Insights` (front) e `InsightsOverview` (backend):

| Caminho | Front | Backend | Ação |
|---|---|---|---|
| `empty` | não tem | `boolean` | adicionar no front, usar para o painel de onboarding |
| `resumes` | não tem | `[{id, title, latestVersionNumber}]` | adicionar, é o que o onboarding oferece para analisar |
| `averageScore` | `number` | `number \| null` | tratar `null` |
| `bestScore` | `{value, resumeId, resumeTitle}` | `{value, resumeId, resumeTitle, createdAt} \| null` | tratar `null` |
| `totalAnalyses` | `number` | `number` | ok |
| `scoreTrend[].at` | `at` | `createdAt` | **alinhar** |
| `scoreTrend[].resumeId` | não tem | tem | adicionar |
| `topIssues[]` | `{title, severity, count}` | `{title, count, severity}` | ok |
| `topMissingKeywords[]` | `{keyword, count}` | idem | ok |
| `topPresentKeywords[]` | `{keyword, count}` | idem | ok |
| `resumePerformance[]` | `{resumeId, title, latestScore, bestScore, improvement, analysesCount}` | idem | ok |

O backend já foi escrito pensando no estado vazio (o comentário em `Insights.ts` explica: o shape não muda, as listas voltam vazias e os escores nulos). O front não conhece `empty` e trata `averageScore` como sempre presente. Ajustar `src/pages/Insights.tsx` para ramificar em `empty` e renderizar o painel de onboarding com a lista `resumes`.

`scoreTrend[].at` contra `createdAt` é mais uma quebra silenciosa: o gráfico renderiza com eixo X inválido, sem erro.

### 7.7 Padronizar `createdAt`

O padrão `at` contra `createdAt` aparece em três lugares: `activity[]` do dashboard, `scoreTrend[]` dos insights e `events[]` do history novo.

Decisão: usar **`createdAt`** em tudo, alinhando com as entidades. Ajustar no front:
- `src/types/api.ts`: `ActivityItem.at`, `ScoreTrendPoint.at`, `HistoryEvent.at`.
- `src/components/dashboard/ActivityFeed.tsx`
- `src/components/dashboard/ScoreEvolutionChart.tsx`
- `src/pages/History.tsx` (`dayKey(e.at)` e `relativeTime(e.at)`)
- `src/pages/Insights.tsx`

Datas chegam como string ISO no JSON, os tipos do front continuam `ISODateString`. Não tentar tipar como `Date`.

---

## 8. Fase 5: lacunas de feature

Aqui não é formato, é comportamento diferente. Exige decisão de produto antes de código.

### 8.1 Rewrite seletivo

**Front.** `useApplyRewrites` envia `{rewriteIds: string[], analysisId}`. `src/components/analysis/BulletRewrites.tsx` tem checkbox por bullet, o usuário escolhe quais aplicar.

**Backend.** `ApplyRewritesDto` aceita só `analysisId`. `ResumeService.applyRewrites` aplica **todos** os rewrites da análise, e o `appliedCount` retornado é `rewrites.length`, não a contagem do que o usuário pediu.

Com `forbidNonWhitelisted`, mandar `rewriteIds` derruba a request com 400. Não é degradação silenciosa, é erro.

**Correção.** Suportar seleção no backend:

1. Garantir `id` estável em cada `BulletRewrite`. Hoje é `id?`, opcional, gerado (ou não) pelo `AnalysisGeneratorService`. Se vier vazio não há como referenciar. Tornar obrigatório na persistência, gerando no momento em que a análise é gravada.

2. `ApplyRewritesDto`:

```ts
@ApiPropertyOptional({
  description:
    'Rewrites a aplicar. Omitido, aplica todos os da análise.',
  type: [String],
})
@IsOptional()
@IsArray()
@IsString({ each: true })
rewriteIds?: string[];
```

3. `ResumeService.applyRewrites` filtra antes de aplicar, e `appliedCount` passa a refletir o filtro:

```ts
const all = analysis.bulletRewrites || [];
const rewrites = rewriteIds?.length
  ? all.filter((r) => rewriteIds.includes(r.id))
  : all;

if (!rewrites.length) {
  throw new BadRequestException('No rewrites to apply');
}
```

4. Decidir o comportamento quando um id enviado não existe na análise: ignorar em silêncio ou responder 400. Preferir 400, o cliente mandou algo que não faz sentido.

5. Atualizar `src/application/__test__/resume.service.spec.ts` com os casos: lista vazia, subconjunto, id inexistente.

### 8.2 Upload: retorno

**Front.** `resumesApi.upload` devolve `{resume}` e o hook usa `data.resume.title` no toast, depois navega para o detalhe.

**Backend.** `POST /resumes` devolve `{resume, version, meta: {numPages}}`.

**Correção.** Ajustar o tipo `ResumeUploadResponse` no front para `{resume, version, meta}`. O `version` retornado é útil: dá para navegar direto para `/resumes/:id?version=:versionId` sem um refetch.

**Detalhe importante.** O upload dispara extração de PDF **e** parse estruturado por IA (`StructuredParserService.parseResume`) de forma síncrona. Pode passar bem dos 30 segundos. O front tem `mockDelay(800)` e nenhum timeout configurado no axios. Definir um timeout generoso para essa chamada especificamente (120s), ou mover o parse para background com polling. Para a primeira versão, timeout maior resolve.

Limites que o front precisa respeitar e comunicar: `MAX_UPLOAD_SIZE_BYTES` (5MB) e `ALLOWED_UPLOAD_MIME_TYPES` (`src/constants.ts` do backend). A `UploadDropzone` deve validar antes de subir, para não gastar upload em arquivo que o servidor vai recusar com 413.

### 8.3 Delete de currículo

**Front.** `useDeleteResume` recebe o id mas chama `resumesApi.remove()` sem argumento nenhum, e a façade mock ignora. É um bug latente do boilerplate que vai virar bug real na hora de conectar.

**Correção.** `src/api/resumes.ts`:

```ts
remove: (id: string) => apiClient.delete(`/resumes/${id}`).then((r) => r.data),
```

E no hook, `mutationFn: (id: string) => resumesApi.remove(id)`.

### 8.4 `POST /api/v1/upload` sem consumidor

O backend expõe `POST /api/v1/upload`, que extrai texto de um PDF sem criar currículo. Nenhuma tela do front usa. Não é problema, mas registrar a decisão: manter como utilitário e documentar, ou remover junto com o `UploadController`. `UploadService` continua sendo usado internamente por `ResumeService.createFromUpload`, então só o controller sairia.

### 8.5 Endpoints do backend sem uso no front

Para referência, o que existe e ninguém consome:

- `GET /api/v1/profile/all` e `GET /api/v1/profile/admins`: rotas de admin. Não há tela de admin no front.
- `POST /api/v1/profile`: cria profile avulso. O fluxo real de criação passa pela saga de registro (`registration.saga.ts`). Rota perigosa, avaliar remoção.
- `GET /api/v1/profile/:id`: perfil por id. Redundante com `/auth/me` para o usuário logado.
- `DELETE /api/v1/auth/:id`: exclusão de conta. Vale expor em `Settings.tsx` numa aba de zona de perigo, é requisito de LGPD.
- `GET /api/v1/auth/google` e `/google/redirect`: OAuth Google completo no backend. A tela de login não tem botão. Feature pronta e desperdiçada, vale ligar.
- `GET /health`: health check, fora do prefixo `/api`.

---

## 9. Checklist de execução

### Fase 0: fundação

- [ ] Corrigir target do proxy no `vite.config.js` para a porta 4000
- [ ] `baseURL` do axios para `/api/v1`, lendo de `VITE_API_URL`
- [ ] Criar `frontend/.env.example`
- [ ] Descomentar a instância do axios em `src/api/client.ts`
- [ ] Interceptor de response desembrulhando `data.data`
- [ ] Interceptor de erro lendo `data.message` e `data.error.code`
- [ ] Adicionar `code` ao tipo `ApiError`
- [ ] Renomear `_id` para `id` em `src/types/api.ts` e propagar
- [ ] Decidir sobre CORS no backend

### Fase 1: autenticação

- [ ] Backend: `GET /api/v1/auth/me`, declarado antes de `@Get(':id')`
- [ ] Backend: interface `AuthenticatedUser`, sem expor `password` nem hash de refresh
- [ ] Backend: `lastname` e `age` opcionais no `RegisterAuthDto`
- [ ] Backend: padronizar retorno de `login` e `register` com `{access_token, refresh_token, user}`
- [ ] Backend: `PUT /profile/me` devolvendo o mesmo shape de `/auth/me`
- [ ] Front: armazenamento de token e interceptor de request com `Authorization`
- [ ] Front: retry no 401 via `/auth/refresh-token`, com guarda contra loop e fila
- [ ] Front: `authApi.me` apontando para `/auth/me`
- [ ] Front: `updateProfile` para `PUT /profile/me`, assinatura estreitada
- [ ] Front: `changePassword` para `POST /auth/change-password`, com `oldPassword`
- [ ] Front: logout limpando os tokens
- [ ] Front: forçar logout depois de trocar a senha
- [ ] Testes: `auth.service.spec.ts` cobrindo `getMe`

### Fase 2: endpoints faltando

- [ ] `src/domain/entities/History.ts` com os read models
- [ ] `HistoryDomainService` com testes
- [ ] `findAllByResumeIds` na interface e na implementação do repositório de versões
- [ ] Método de histórico completo de análises no repositório de análises
- [ ] `HistoryService` com testes
- [ ] `VersionsController` (`GET /api/v1/versions`)
- [ ] `HistoryController` (`GET /api/v1/history`)
- [ ] `HistoryModule`, registrado no `ApplicationModule`
- [ ] Controllers registrados no `ApiModule`
- [ ] Migrar o feed de atividade do dashboard para o `HistoryDomainService`
- [ ] Front: apontar `analyticsApi.versions` e `analyticsApi.history` para os endpoints reais

### Fase 3: nomes de rota

- [ ] `@Post(':id/analyzer')` para `@Post(':id/analyze')`
- [ ] `@Get(':id/analysis')` para `@Get(':id/analyses')`
- [ ] Atualizar `test/app.e2e-spec.ts` se cobrir esses paths

### Fase 4: contratos

- [ ] `bestScore` no read model de `GET /resumes`
- [ ] `score` por versão no read model de `GET /resumes/:id`
- [ ] Front: `versionCount` mapeado de `latestVersionNumber`
- [ ] Front: `ParsedSections` com todos os campos opcionais, revisando `ResumeDocument`
- [ ] Front: `projects[].summary` para `description`, `certifications[].year` para string
- [ ] Front: conversão de `scoreBreakdown` de objeto para array, com labels no i18n
- [ ] i18n: chaves `breakdown.keywords`, `.formatting`, `.impact`, `.clarity` em pt-BR e en
- [ ] Front: `strengths[].note` para `evidence`
- [ ] Front: adaptador de `parts` para `hunks` no diff, usando `stats` no cabeçalho
- [ ] Backend: `kpi.issues` para `issuesIdentified` e `kpi.keywords` para `keywordsMatched`, ou o inverso no front
- [ ] Backend: `total` em `keywordsMatched`
- [ ] Alinhar `spark[].v` com `spark[].value`
- [ ] Alinhar `activity[].type`: `analyze` contra `analysis`
- [ ] Padronizar `at` para `createdAt` em dashboard, insights e history
- [ ] Front: tratar `latestResume: null` no dashboard
- [ ] Front: tratar `kpi.*.value` e `delta` nulos
- [ ] Front: usar `empty` e `resumes` nos insights, com painel de onboarding
- [ ] Front: tratar `averageScore` e `bestScore` nulos
- [ ] Definir o destino de `totals.exports`

### Fase 5: features

- [ ] `rewriteIds` opcional no `ApplyRewritesDto`
- [ ] Filtro de rewrites no `ResumeService.applyRewrites`, com `appliedCount` correto
- [ ] `id` obrigatório em `BulletRewrite` na persistência
- [ ] Testes do rewrite seletivo
- [ ] Front: `remove(id)` passando o id
- [ ] Front: `ResumeUploadResponse` como `{resume, version, meta}`
- [ ] Front: timeout ampliado no upload
- [ ] Front: validação de tamanho e mime na `UploadDropzone`
- [ ] Decidir sobre `POST /upload`, rotas de admin e `POST /profile`

### Encerramento

- [ ] Deletar `frontend/src/mock/` inteira
- [ ] Remover os comentários de "TO ENABLE THE REAL BACKEND" das façades
- [ ] Remover o placeholder `apiClient = null`
- [ ] `npm run lint` e `npm run build` no front
- [ ] `pnpm run lint` e `pnpm run test` no backend
- [ ] Teste e2e do fluxo completo: registro, upload, análise, rewrite, diff
- [ ] Atualizar a seção "Camada de dados: mock ligado" do `CLAUDE.md`

---

## Anexo A: mapa completo rota a rota

Legenda: **OK** existe e o path bate, **PATH** existe em outro caminho ou verbo, **FALTA** não existe.

### Auth

| Front | Backend | Status | Observação |
|---|---|---|---|
| `POST /auth/register` | `POST /api/v1/auth/register` | OK | DTO exige `lastname` e `age`, retorno sem `user` |
| `POST /auth/login` | `POST /api/v1/auth/login` | OK | retorno sem `user`, sem email |
| `POST /auth/logout` | `POST /api/v1/auth/logout` | OK | exige Bearer |
| `GET /auth/me` | não existe | **FALTA** | bloqueador crítico |
| `PATCH /auth/profile` | `PUT /api/v1/profile/me` | PATH | campos divergentes |
| `PATCH /auth/password` | `POST /api/v1/auth/change-password` | PATH | `currentPassword` contra `oldPassword` |
| não usa | `POST /api/v1/auth/refresh-token` | | necessário para o fluxo de token |
| não usa | `GET /api/v1/auth/google` | | OAuth pronto e não ligado |
| não usa | `GET /api/v1/auth/google/redirect` | | |
| não usa | `GET /api/v1/auth/:id` | | |
| não usa | `DELETE /api/v1/auth/:id` | | exclusão de conta |

### Resumes

| Front | Backend | Status | Observação |
|---|---|---|---|
| `GET /resumes` | `GET /api/v1/resumes` | OK | faltam `bestScore` e `versionCount` |
| `GET /resumes/:id` | `GET /api/v1/resumes/:id` | OK | falta `score` por versão |
| `GET /resumes/:id/versions/:vId` | idem | OK | falta `score` |
| `POST /resumes` | `POST /api/v1/resumes` | OK | retorno com `version` e `meta` a mais |
| `DELETE /resumes/:id` | `DELETE /api/v1/resumes/:id` | OK | front não envia o id |
| `POST /resumes/:id/analyze` | `POST /api/v1/resumes/:id/analyzer` | PATH | renomear no backend |
| `GET /resumes/:id/analyses` | `GET /api/v1/resumes/:id/analysis` | PATH | renomear no backend |
| `GET /resumes/:id/versions/:vId/analysis` | idem | OK | shape de `Analysis` divergente |
| `POST /resumes/:id/rewrite` | idem | OK | `rewriteIds` recusado com 400 |
| `GET /resumes/:id/diff` | idem | OK | `parts` contra `hunks` |
| não usa | `POST /api/v1/upload` | | sem consumidor |

### Analytics

| Front | Backend | Status | Observação |
|---|---|---|---|
| `GET /dashboard` | `GET /api/v1/dashboard` | OK | várias divergências de shape |
| `GET /insights` | `GET /api/v1/insights` | OK | falta `empty` e `resumes` no front |
| `GET /versions` | não existe | **FALTA** | página `Versions.tsx` pronta |
| `GET /history` | não existe | **FALTA** | página `History.tsx` pronta |

### Profile

| Front | Backend | Status |
|---|---|---|
| não usa | `GET /api/v1/profile/all` | admin |
| não usa | `GET /api/v1/profile/admins` | admin |
| não usa | `POST /api/v1/profile` | avaliar remoção |
| não usa | `GET /api/v1/profile/:id` | |
| via `updateProfile` | `PUT /api/v1/profile/me` | ver 4.5 |

### Infra

| Rota | Observação |
|---|---|
| `GET /health` | fora do prefixo `/api` |
| `GET /api/docs` | Swagger, sem versão no path, só fora de produção |
| `GET /api/v1/hello` | `HelloController`, boilerplate |
