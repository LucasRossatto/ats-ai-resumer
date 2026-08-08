# Integração Frontend x Backend

Levantamento do que falta para desligar os mocks do frontend e consumir o backend de verdade. Serve como plano de implementação: cada seção traz o estado atual, o que precisa mudar e onde.

Última revisão: 2026-08-02
Branch analisada: `dev`, até o commit `835a302`

---


## Sumário

1. [O que mudou nesta revisão](#1-o-que-mudou-nesta-revisão)
2. [Estado atual](#2-estado-atual)
3. [Resumo executivo](#3-resumo-executivo)
4. [Fase 0: fundação](#4-fase-0-fundação)
5. [Fase 1: autenticação](#5-fase-1-autenticação)
6. [Fase 2: endpoints de agregação](#6-fase-2-endpoints-de-agregação-concluída)
7. [Fase 3: rotas com nome divergente](#7-fase-3-rotas-com-nome-divergente)
8. [Fase 4: divergências de contrato campo a campo](#8-fase-4-divergências-de-contrato-campo-a-campo)
9. [Fase 5: lacunas de feature](#9-fase-5-lacunas-de-feature)
10. [Checklist de execução](#10-checklist-de-execução)
11. [Anexo A: mapa completo rota a rota](#anexo-a-mapa-completo-rota-a-rota)

---

## 1. O que mudou nesta revisão

Quatro entregas no backend entre a primeira versão deste documento e agora:

| Commit | Entrega | Efeito |
|---|---|---|
| `74b6c5d` | módulo de versions | `GET /api/v1/versions` criado |
| `782dc49` | módulo de history | `GET /api/v1/history` criado |
| `5eef6b8` | endpoint `getMe` | `GET /api/v1/auth/me` criado |
| `835a302` | troca de senha | `PATCH /api/v1/auth/password` criado |

**Resultado: nenhum endpoint falta mais.** Os três buracos apontados na revisão anterior (`/auth/me`, `/versions`, `/history`) foram fechados, e os contratos dos três batem com o que o frontend espera, campo por campo. A troca de senha ganhou um alias em `PATCH /auth/password` com exatamente os nomes de campo que a tela de Settings usa, o que elimina outro item da lista.

O frontend continua intocado e 100% mockado. Nenhum item da Fase 0 foi endereçado.

**Novo problema introduzido:** os módulos de versions e history adotaram a convenção do frontend (`at` para data de evento, `analyze` para o tipo de análise), enquanto o dashboard, escrito antes, usa `createdAt` e `analysis`. O backend agora é inconsistente consigo mesmo. Ver seção 8.7.

---

## 2. Estado atual

### Frontend

Ligado. `frontend/src/api/client.ts` é uma instância real de axios, com Bearer token, refresh na fila e desembrulho do envelope. As quatro façades consomem o backend, nenhuma tela depende mais de dado falso.

| Arquivo | Chamadas | Origem dos dados |
|---|---|---|
| `src/api/auth.ts` | 6 | backend |
| `src/api/resumes.ts` | 10 | backend |
| `src/api/dashboard.ts` | 1 | backend |
| `src/api/analytics.ts` | 3 | backend |

A pasta `src/mock/` foi deletada inteira.

Tipos esperados pelo front vivem em `src/types/api.ts`. É esse arquivo que define o contrato do lado do cliente e é ele que precisa ser reconciliado com as entidades de domínio do backend.

### Backend

Dez controllers registrados em `src/api/api.module.ts`:

`AuthController`, `ProfileController`, `HelloController`, `UploadController`, `ResumeController`, `AnalysisController`, `DashboardController`, `InsightsController`, `VersionsController`, `HistoryController`.

Prefixo global `api` (`API_BASE_PATH` em `src/constants.ts`) e versionamento por URI com default `1` (`src/main.ts`). Toda rota vive em `/api/v1/...`, exceto `/health`, excluída do prefixo, e o Swagger em `/api/docs`.

---

## 3. Resumo executivo

Das 20 chamadas do frontend:

- **17 têm endpoint no path exato** que o front espera.
- **3 existem em outro path ou verbo**: atualização de perfil, `analyze` e `analyses`.
- **0 faltam.**

O trabalho restante mudou de natureza: não é mais construir endpoint, é reconciliar contrato e ligar o frontend. Continuam valendo os quatro bloqueadores transversais, todos do lado do front:

1. Base URL divergente (`/api` no front, `/api/v1` no backend) e proxy do Vite apontando para a porta errada.
2. Envelope de resposta (`{message, data, ...}`) que o front não desembrulha.
3. Modelo de autenticação incompatível (cookie no front, Bearer com refresh no backend).
4. Identificador `_id` no front contra `id` no backend, nas entidades principais.

Ordem recomendada: fundação, autenticação, nomes de rota, shapes, features.

---

## 4. Fase 0: fundação

Nada mais funciona antes disso. Quatro itens, todos no frontend, nenhum iniciado.

### 4.1 Base URL e proxy

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

### 4.2 Envelope de resposta

**Problema.** Todo controller retorna via `ResponseService`, e existe um `ResponseInterceptor` global registrado em `src/app.module.ts` (`APP_INTERCEPTOR`). O corpo real de qualquer 200 é:

```json
{
  "message": "Resumes retrieved successfully",
  "data": [ ... ],
  "timestamp": "2026-08-02T12:00:00.000Z",
  "path": "/api/v1/resumes",
  "method": "GET"
}
```

O frontend espera o objeto direto, e além disso espera chaves nomeadas que o backend nem sempre usa. Exemplo: `resumesApi.list()` faz `.then((d) => d.resumes)`, mas o backend devolve o array cru dentro de `data`.

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
  (err) => { /* ver 4.3 */ }
);
```

Segundo, ajustar cada façade em `src/api/*.ts` para parar de esperar a chave nomeada. Mapa do que o backend devolve dentro de `data`, já considerando os endpoints novos:

| Chamada | Envelope atual no front | Conteúdo real de `data` |
|---|---|---|
| `GET /resumes` | `{resumes}` | `Resume[]` |
| `GET /resumes/:id` | `{resume, versions}` | `{resume, versions}`, bate |
| `GET /resumes/:id/versions/:vId` | `{version}` | `ResumeVersion` |
| `POST /resumes` | `{resume}` | `{resume, version, meta}` |
| `POST /resumes/:id/rewrite` | `{version, appliedCount}` | idem, bate |
| `GET /resumes/:id/diff` | `{from, to, parts, stats}` | idem, bate |
| `GET /resumes/:id/analyses` | `{analyses}` | `Analysis[]` |
| `GET /.../versions/:vId/analysis` | `{analysis}` | `Analysis` |
| `GET /dashboard` | objeto direto | `DashboardOverview`, bate |
| `GET /insights` | objeto direto | `InsightsOverview`, bate |
| `GET /versions` | objeto direto | `{versions, totals}`, bate |
| `GET /history` | objeto direto | `{events, totals}`, bate |
| `GET /auth/me` | `{user}` | `{user}`, bate |

Os hooks em `src/hooks/useResumes.ts` que fazem `.then((d) => d.resumes)` e similares precisam acompanhar.

### 4.3 Formato de erro

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

### 4.4 Identificador `id` contra `_id`

**Problema.** Todas as entidades do backend expõem `id` (`Resume`, `ResumeVersion`, `Analysis`, `Profile`, `AuthUser`, `CurrentUser`). Os tipos principais do front usam `_id` (`User._id`, `Resume._id`, `ResumeVersion._id`, `Analysis._id`, `BulletRewrite._id`).

Os itens de lista já usam `id` no front (`VersionStackItem.id`, `ActivityItem.id`, `VersionsListItem.id`, `HistoryEvent.id`) e batem com o backend. A inconsistência é só nas entidades principais.

**Correção.** Renomear `_id` para `id` em `src/types/api.ts` e propagar:

- `src/types/api.ts`: `User`, `ResumeVersion`, `Resume`, `Analysis`, `BulletRewrite`, e os derivados `ResumeShallow` e `ResumeSummary`.
- `src/mock/*.ts`: a pasta será deletada ao final, mas enquanto coexistir precisa acompanhar para o build passar.
- Componentes que leem `_id`: `ResumeRow`, `VersionSwitcher`, `BulletRewrites`, páginas `Resumes`, `ResumeDetail`, `Export`.

Fazer via renomeação global de `._id` para `.id` e revisar caso a caso é mais rápido que mapear por entidade.

---

## 5. Fase 1: autenticação

Metade concluída. Os dois endpoints que faltavam existem e batem com o front. O que resta é o fluxo de token no cliente e três ajustes de contrato.

### 5.1 O que o backend oferece hoje

| Rota | Retorno | Status |
|---|---|---|
| `POST /api/v1/auth/register` | `{access_token, refresh_token, user}` | contrato bate |
| `POST /api/v1/auth/login` | `{access_token, refresh_token, user}` | contrato bate |
| `POST /api/v1/auth/logout` | `{message}`, exige Bearer | ok |
| `GET /api/v1/auth/me` | `{user: CurrentUser}`, exige Bearer | **novo, contrato bate** |
| `POST /api/v1/auth/refresh-token` | `{access_token, ...}`, body `{refresh_token}` | ok |
| `POST /api/v1/auth/change-password` | `{message}`, body `{oldPassword, newPassword}` | ok |
| `PATCH /api/v1/auth/password` | `{ok: true}`, body `{currentPassword, newPassword}` | **novo, contrato bate** |
| `GET /api/v1/auth/google` | redirect OAuth | sem consumidor |
| `GET /api/v1/auth/google/redirect` | callback OAuth | sem consumidor |
| `GET /api/v1/auth/:id` | `CurrentUser` | ok |
| `DELETE /api/v1/auth/:id` | remove auth e profile | sem consumidor |
| `PATCH /api/v1/auth/profile` | `CurrentUser`, body `{name?, lastname?, age?}` | **novo, contrato bate** |
| `PUT /api/v1/profile/me` | `CurrentUser`, mesmo body | alias do anterior |

O payload do JWT é `{sub, email, roles}` e a `JwtStrategy` devolve `{id: payload.sub, email, roles}` em `req.user`. O decorator `@CurrentUserId()` extrai `req.user.id`, que é o **auth id**, não o profile id. Isso importa: os currículos são gravados com `userId = authId`.

### 5.2 `GET /auth/me`, concluído

Implementado em `src/api/controllers/auth.controller.ts`, declarado antes de `@Get(':id')` com comentário explicando o porquê, o que evita que `me` seja capturado como parâmetro de rota.

Retorna `{user}` com a interface `CurrentUser` (`src/domain/entities/Auth.ts`):

```ts
export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;   // vem do profile, null na janela antes da saga criar
  roles: Role[];
  createdAt?: Date;
}
```

Montada por `AuthDomainService.toCurrentUser(auth, profile)`, sem expor `password` nem `currentHashedRefreshToken`.

**Comparação com o front** (`AuthResponse` e `User` em `src/types/api.ts`):

| Front | Backend | Ação |
|---|---|---|
| `{user}` | `{user}` | bate |
| `user._id` | `user.id` | renomear no front, item 4.4 |
| `user.name: string` | `name: string \| null` | tornar nulável no front |
| `user.email` | `email` | bate |
| `user.createdAt` | `createdAt?` | tornar opcional |
| não tem | `roles: Role[]` | adicionar, habilita esconder UI de admin |

Trabalho restante no front: apontar `authApi.me` para `/auth/me` e ajustar o tipo `User`.

### 5.3 Fluxo de token no frontend, pendente

**O que falta.** Tudo. Hoje não existe nem armazenamento nem header. `client.ts` está comentado e configurado com `withCredentials: true`, que assume sessão por cookie, modelo que o backend não usa.

Implementar em `src/api/client.ts`:

```ts
// localStorage sobrevive a reload, que é o comportamento que o AuthContext
// assume ao chamar me() no boot.
const TOKEN_KEY = "ats.access_token";
const REFRESH_KEY = "ats.refresh_token";

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

E o retry no 401, com guarda contra loop e fila para requisições concorrentes.

Pontos de atenção:

- Não tentar refresh quando a chamada que falhou for `/auth/refresh-token`, `/auth/login` ou `/auth/register`.
- Requisições concorrentes que tomem 401 juntas devem esperar um único refresh, não disparar N.
- `authApi.logout()` limpa as duas chaves do storage, independente da resposta do backend.
- Remover `withCredentials`. O único cookie do backend é `oauth_state`, usado server side no fluxo Google.

### 5.4 Register e login: payload e retorno

**Problema no register.** `RegisterAuthDto` continua exigindo cinco campos obrigatórios: `name`, `lastname`, `age`, `email`, `password`. A página `src/pages/Register.tsx` monta o form com três: `{name, email, password}`.

Com `ValidationPipe({whitelist: true, forbidNonWhitelisted: true})` global, faltar `lastname` e `age` derruba a request com 400.

Duas saídas:

- **A (recomendada).** Tornar `lastname` e `age` opcionais no DTO com `@IsOptional()`. O produto é um analisador de currículo, idade não é dado necessário no cadastro.
- **B.** Adicionar os campos ao formulário. Aumenta atrito sem ganho claro.

**Problema no retorno.** `AuthContext` espera `{user}` em login e register, o mesmo shape que `/auth/me` já devolve. Os dois continuam devolvendo `{access_token, refresh_token, profile: {id, name, age}}`. Falta o email, falta `createdAt`, e `profile.id` é o profile id, não o auth id que identifica o dono dos currículos.

**Correção.** Padronizar login e register para:

```ts
{
  access_token: string;
  refresh_token: string;
  user: CurrentUser;   // exatamente o que /auth/me já devolve
}
```

Reusar `AuthDomainService.toCurrentUser`, que já existe. Assim o front tem um único tipo `User` para os três endpoints.

### 5.5 Atualização de perfil, pendente

**Problema.** Front chama `PATCH /auth/profile` com `Partial<User>`, que inclui `email`. Backend tem `PUT /api/v1/profile/me` com `UpdateProfileDto` aceitando só `{name?, lastname?, age?}`. Enviar `email` derruba com 400 pelo `forbidNonWhitelisted`.

Hoje o único campo que `Settings.tsx` edita é `name`, e o campo de email já está `disabled`. O conflito é de path, verbo e de tipagem larga demais.

**Duas opções.**

- **A.** Ajustar o front, `src/api/auth.ts`:

```ts
updateProfile: (payload: { name?: string; lastname?: string }) =>
  apiClient.put("/profile/me", payload).then((r) => r.data),
```

- **B.** Criar um alias `PATCH /auth/profile` no `AuthController` delegando ao `ProfileService`, no mesmo padrão que foi feito com `PATCH /auth/password`. Mantém tudo que é do usuário logado sob `/auth` e o front não muda o path.

A opção B é coerente com a decisão já tomada na troca de senha e deixa o front com um único domínio de rota para dados do usuário. Escolher uma e aplicar às duas rotas.

Em qualquer caso, estreitar a assinatura de `updateProfile` no `AuthContext` de `Partial<User>` para `{name?, lastname?}`, senão o TypeScript continua deixando passar `email`.

**Detalhe.** `PUT /profile/me` devolve a entidade `Profile` (`{id, authId, name, lastname, age}`), não o `CurrentUser` que o `AuthContext` guarda no estado. Fazer a rota devolver `CurrentUser`, para não ter duas fontes de verdade do usuário.

### 5.6 Troca de senha, concluído

`PATCH /api/v1/auth/password` foi criado com `UpdatePasswordDto` aceitando `{currentPassword, newPassword}`, exatamente os nomes que `src/pages/Settings.tsx` já usa. Delega ao mesmo `authService.changePassword` que `POST /auth/change-password`, então as regras de força de senha e a revogação do refresh token continuam num lugar só.

Trabalho restante no front: descomentar a chamada, que já aponta para `PATCH /auth/password`. Nenhum ajuste de campo é necessário.

**Efeito colateral a tratar.** `changePassword` zera `currentHashedRefreshToken`. O refresh token guardado no front deixa de valer na hora. Ou o front força logout depois de trocar a senha, ou o backend devolve tokens novos. Forçar logout é o comportamento mais previsível e é o que a maioria dos produtos faz. Hoje o front só mostra um toast de sucesso e mantém a sessão, que vai falhar no próximo refresh.

---

## 6. Fase 2: endpoints de agregação (concluída)

Os dois endpoints foram implementados seguindo a arquitetura do projeto: entidade de domínio, domain service puro, application service, controller e testes em ambos os níveis. Os contratos batem com o front.

### 6.1 `GET /api/v1/versions`

**Consumidor.** `src/pages/Versions.tsx` via `useAllVersions()`.

**Implementação.** `VersionsController`, `VersionsService`, `VersionsDomainService`, entidade `src/domain/entities/Version.ts`. O score vem de `analysisRepository.findStatsByIds` sobre os `latestAnalysisId` das versões, uma query só, nunca uma por versão. Foi adicionado `findAllByResumeIds` ao `IResumeVersionRepository`.

**Verificação de contrato.**

| Front (`AllVersions`) | Backend (`VersionList`) | Situação |
|---|---|---|
| `totals: {all, uploads, rewrites}` | idem | bate |
| `versions[].id` | `id` | bate |
| `versions[].label` | `label` | bate |
| `versions[].resumeId` | `resumeId` | bate |
| `versions[].resumeTitle` | `resumeTitle` | bate |
| `versions[].sourceType` | `sourceType` | bate |
| `versions[].score: number` | `score: number \| null` | tipar como nulável no front |
| `versions[].createdAt` | `createdAt?` | tornar opcional no front |
| não tem | `versionNumber`, `parentVersionId` | extras, ignorar ou aproveitar |

Duas correções de tipo no front, nenhuma no backend. A página já trata `score` nulo em runtime (`version.score != null`), só o tipo é que mente.

### 6.2 `GET /api/v1/history`

**Consumidor.** `src/pages/History.tsx` via `useHistory()`.

**Implementação.** `HistoryController`, `HistoryService`, `HistoryDomainService`, entidade `src/domain/entities/History.ts`. Funde três fontes numa linha do tempo: currículos criados, versões de rewrite e análises. Os ids vêm prefixados por origem (`r-`, `v-`, `a-`) para não colidirem nas keys da lista. Foi adicionado `findAllStatsByUserId` ao `IAnalysisRepository`.

**Verificação de contrato.**

| Front (`History`) | Backend (`History`) | Situação |
|---|---|---|
| `totals: {all, upload, analyze, rewrite}` | idem | bate |
| `events[].id` | `id` | bate |
| `events[].type: "upload"\|"analyze"\|"rewrite"` | idem | bate |
| `events[].title` | `title` | bate |
| `events[].subtitle` | `subtitle` | bate |
| `events[].label` | `label` | bate |
| `events[].at` | `at?` | tornar opcional no front |
| `events[].resumeId` | `resumeId` | bate |
| não tem | `resumeTitle` | extra, aproveitar na UI |

Uma correção de tipo no front.

### 6.3 Duplicação a resolver

O `DashboardDomainService` continua montando seu próprio feed de atividade, limitado a 8 itens, com shape diferente do `HistoryDomainService` que agora existe. São duas implementações do mesmo feed que já divergiram em dois campos (ver 8.7).

**Correção.** Migrar o dashboard para consumir `HistoryDomainService.buildEvents` com um limite, e apagar a construção duplicada em `DashboardDomainService`. O dashboard passa a chamar com `limit: 8`, o `/history` chama sem limite. Isso resolve a inconsistência de 8.7 de uma vez, em vez de renomear campo a campo.

---

## 7. Fase 3: rotas com nome divergente

Três rotas onde o problema é só o nome ou o verbo. Nenhuma foi endereçada ainda.

### 7.1 `analyzer` para `analyze`

`src/api/controllers/analysis.controller.ts`, linha 41:

```diff
- @Post(':id/analyzer')
+ @Post(':id/analyze')
```

`analyzer` é substantivo, o endpoint é uma ação. `analyze` também é o que o front já espera.

### 7.2 `analysis` para `analyses`

`src/api/controllers/analysis.controller.ts`, linha 65:

```diff
- @Get(':id/analysis')
+ @Get(':id/analyses')
```

O endpoint devolve uma coleção, o plural é o correto e evita ambiguidade com `GET /:id/versions/:versionId/analysis`, que devolve uma única análise e permanece no singular.

Atualizar `test/app.e2e-spec.ts` se ele exercitar esses paths.

### 7.3 Perfil

Ver 5.5. Decidir entre mover o front para `PUT /profile/me` ou criar o alias `PATCH /auth/profile`, seguindo o precedente da troca de senha.

---

## 8. Fase 4: divergências de contrato campo a campo

O grosso do trabalho restante. Cada subseção compara o que o backend produz com o que o front consome, e propõe o lado que deve ceder.

Princípio adotado: **o backend é a fonte de verdade do domínio, o front se adapta**, exceto quando o front precisa de um dado agregado que o backend não tem. Nesses casos o backend ganha o campo.

### 8.1 `Resume`: faltam `bestScore` e `versionCount`

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

`ResumeService.findAllByUser` passa a cruzar com o repositório de análises. O `findAllStatsByUserId` que o history introduziu já traz `resumeId` e `atsScore` de todo o histórico, dá para derivar o melhor score por currículo sem query nova.

Devolver `null` quando o currículo nunca foi analisado. Zero leria como nota ruim, não como ausência de dado, o mesmo raciocínio já aplicado em `VersionListItem.score`.

### 8.2 `ResumeVersion`: falta `score`

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

**Correção.** Mesma estratégia do `/versions`, que já resolveu isso: enriquecer o read model de `GET /resumes/:id` com o score derivado de `latestAnalysisId` via `findStatsByIds`. O `VersionsService` serve de referência direta, é a mesma operação em outro escopo. Não adicionar `score` como coluna em `ResumeVersion`, seria duplicar estado que pertence a `Analysis`.

**Sobre `parsedSections`.** Todos os campos são opcionais no backend e obrigatórios no front. Como o parse é feito por IA e pode falhar parcialmente, o backend está certo. Tornar tudo opcional no front e revisar os consumidores, principalmente `src/components/export/ResumeDocument.tsx`, que renderiza o currículo inteiro e vai quebrar em seção ausente.

Diferenças pontuais dentro de `ParsedSections`:

| Campo | Front | Backend |
|---|---|---|
| `experience[].location` | não tem | tem |
| `education[].details` | não tem | tem |
| `projects[].summary` | `summary` | `description` |
| `projects[].links` | não tem | tem |
| `certifications[].year` | `number` | `string` |
| `certifications[].issuer` | não tem | tem |

`projects[].summary` contra `description` e `certifications[].year` como número contra string são quebras silenciosas: o campo vem vazio ou o formato não bate, sem erro. Alinhar pelo backend.

### 8.3 `Analysis`

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
| `bulletRewrites` | `bulletRewrites?` | ver 9.1 |
| não tem | `resumeId`, `userId`, `promptTokens`, `createdAt` | adicionar `resumeId` e `createdAt` no front |

**`scoreBreakdown` é a divergência estrutural.** O front espera um array de `{label, value}` e itera para desenhar as barras em `src/components/analysis/ScoreBreakdown.tsx`. O backend devolve um objeto de chaves fixas.

Recomendação: manter o objeto no backend, ele é mais fiel ao domínio (as quatro dimensões são fixas, não uma lista arbitrária), e converter no front, com o label vindo do i18n:

```ts
const BREAKDOWN_KEYS = ["keywords", "formatting", "impact", "clarity"] as const;

const items = BREAKDOWN_KEYS
  .filter((k) => analysis.scoreBreakdown?.[k] != null)
  .map((k) => ({ key: k, label: t(`breakdown.${k}`), value: analysis.scoreBreakdown[k] }));
```

Isso resolve de quebra um problema existente: o `label` viria do backend em inglês e escaparia do i18n. Adicionar as quatro chaves em `src/i18n/locales/pt-BR/analysis.json` e `en/analysis.json`.

### 8.4 Diff

**Resolvido.** O `DiffResponse` do front era `{hunks: [{type, text}]}`, enquanto o `DiffView` já lia `stats` e `parts`. Com o mock devolvendo `hunks`, a aba de diff quebrava com `Cannot read properties of undefined (reading 'added')`.

O front foi alinhado ao contrato do backend, sem adaptador: `DiffResponse` em `src/types/api.ts` agora é `{from, to, parts, stats}`, o mock de `src/api/resumes.ts` devolve esse mesmo shape e `DiffView` consome os tipos reais, sem cast. Os tipos `DiffHunk` e `DiffHunkType` saíram, não tinham outro consumidor.

`stats` traz os totais de caracteres adicionados e removidos prontos, o `DiffView` mostra no cabeçalho sem contar no cliente.

`mode` aceita `'words' | 'chars' | 'lines' | 'sentences'` no backend. O front só usa `'words'`. Tipar o parâmetro com a união completa em vez de `string`.

### 8.5 Dashboard

Comparação entre `Dashboard` (`src/types/api.ts`) e `DashboardOverview` (`src/domain/entities/Dashboard.ts`):

| Caminho | Front | Backend | Ação |
|---|---|---|---|
| `totals` | `{resumes, rewrites, analyses}` | `{resumes, rewrites, analyses, exports}` | adicionar `exports` no front ou remover no backend |
| `latestResume` | `{_id, title}` | `{id, title, latestVersionNumber, currentVersionId, updatedAt}` ou `null` | front precisa tratar `null` |
| `scoreSeries[]` | `{label, score}` | `{versionId, label, score, createdAt}` | ok, front ignora os extras |
| `versionStack[]` | `{id, label, title, score}` | `{id, label, title, score, delta}` | usar `delta`, o front hoje calcula |
| `kpi.atsScore` | `{value, delta?, spark}` | `{value: number\|null, delta: number\|null, spark}` | tratar `null` |
| `kpi.versions` | idem | idem | tratar `null` |
| `kpi.issuesIdentified` | `{value, delta?, spark}` | `kpi.issues` | **renomear** |
| `kpi.keywordsMatched` | `{value, delta?, spark, total}` | `kpi.keywords`, sem `total` | **renomear**, decidir sobre `total` |
| `kpi.*.spark[]` | `{v: number}` | `{value: number}` | **alinhar** em `value` |
| `activity[].at` | `at` | `createdAt` | **alinhar**, ver 8.7 |
| `activity[].type` | `"analyze"` | `"analysis"` | **alinhar**, ver 8.7 |

Três quebras silenciosas para tratar com prioridade, porque não geram erro, só renderizam vazio: `kpi.issues` contra `issuesIdentified`, `spark[].v` contra `value`, e `activity[].at` contra `createdAt`.

**Sobre `keywordsMatched.total`.** O front mostra "42 de 60 keywords". O backend só devolve o número absoluto. O `DashboardDomainService` pode calcular `keywordsPresent + keywordsMissing` como total, o `AnalysisStat` já carrega os dois contadores. Calcular no backend é melhor, o dado já está na mão.

**Sobre `totals.exports`.** O backend conta exports mas o front não rastreia nada: `src/pages/Export.tsx` gera PDF no cliente sem avisar o servidor. Verificar de onde sai esse número. Se for sempre zero, remover do contrato até a feature existir.

### 8.6 Insights

Comparação entre `Insights` (front) e `InsightsOverview` (backend):

| Caminho | Front | Backend | Ação |
|---|---|---|---|
| `empty` | não tem | `boolean` | adicionar no front, usar no painel de onboarding |
| `resumes` | não tem | `[{id, title, latestVersionNumber}]` | adicionar, é o que o onboarding oferece para analisar |
| `averageScore` | `number` | `number \| null` | tratar `null` |
| `bestScore` | `{value, resumeId, resumeTitle}` | `{value, resumeId, resumeTitle, createdAt} \| null` | tratar `null` |
| `totalAnalyses` | `number` | `number` | ok |
| `scoreTrend[].at` | `at` | `createdAt` | **alinhar**, ver 8.7 |
| `scoreTrend[].resumeId` | não tem | tem | adicionar |
| `topIssues[]` | `{title, severity, count}` | `{title, count, severity}` | ok |
| `topMissingKeywords[]` | `{keyword, count}` | idem | ok |
| `topPresentKeywords[]` | `{keyword, count}` | idem | ok |
| `resumePerformance[]` | `{resumeId, title, latestScore, bestScore, improvement, analysesCount}` | idem | ok |

O backend já foi escrito pensando no estado vazio: o shape não muda, as listas voltam vazias e os escores nulos. O front não conhece `empty` e trata `averageScore` como sempre presente. Ajustar `src/pages/Insights.tsx` para ramificar em `empty` e renderizar o painel de onboarding com a lista `resumes`.

`scoreTrend[].at` contra `createdAt` é outra quebra silenciosa: o gráfico renderiza com eixo X inválido, sem erro.

### 8.7 Inconsistência interna do backend, nova

Os módulos de history e versions adotaram a convenção do frontend. O dashboard, escrito antes, usa outra. Hoje o backend tem duas convenções para o mesmo conceito:

| Conceito | `Dashboard.ts` | `History.ts` | Front |
|---|---|---|---|
| data do evento | `createdAt?` | `at?` | `at` |
| tipo de análise | `'analysis'` | `'analyze'` | `'analyze'` |

Isso é pior do que qualquer uma das duas escolhas isoladas: quem consome os dois endpoints precisa lembrar qual usa qual, e o feed de atividade do dashboard e a timeline do history mostram a mesma coisa com nomes diferentes.

**Recomendação, mudança em relação à revisão anterior.** Antes o documento sugeria padronizar em `createdAt` e `'analysis'`, alinhando com as entidades. Como history e versions já foram entregues com `at` e `'analyze'`, e são os que batem com o front, o menor caminho agora é o inverso: **alinhar o dashboard ao history**.

Concretamente, e de preferência junto com a unificação proposta em 6.3:

- `ActivityEvent.createdAt` para `at`, e `ActivityType` `'analysis'` para `'analyze'`, em `src/domain/entities/Dashboard.ts`.
- `ScoreTrendPoint.createdAt` para `at` em `src/domain/entities/Insights.ts`, para o gráfico de evolução.
- Ajustar `DashboardDomainService`, `InsightsDomainService` e os specs correspondentes.

`ScorePoint.createdAt` do `scoreSeries` e os `createdAt` das entidades de persistência (`Resume`, `ResumeVersion`, `Analysis`, `Profile`) ficam como estão. A regra é: `createdAt` é carimbo de criação de registro, `at` é o instante de um evento numa timeline. São coisas diferentes e podem coexistir.

Fazer essa mudança **antes** de ligar o front, para o front escrever contra um contrato só.

---

## 9. Fase 5: lacunas de feature

Não é formato, é comportamento diferente. Exige decisão de produto antes de código.

### 9.1 Rewrite seletivo

**Front.** `useApplyRewrites` envia `{rewriteIds: string[], analysisId}`. `src/components/analysis/BulletRewrites.tsx` tem checkbox por bullet, o usuário escolhe quais aplicar.

**Backend.** `ApplyRewritesDto` aceita só `analysisId`. `ResumeService.applyRewrites` aplica **todos** os rewrites da análise, e o `appliedCount` retornado é `rewrites.length`, não a contagem do que o usuário pediu.

Com `forbidNonWhitelisted`, mandar `rewriteIds` derruba a request com 400. Não é degradação silenciosa, é erro.

**Correção.** Suportar seleção no backend:

1. Garantir `id` estável em cada `BulletRewrite`. Hoje é `id?`, opcional, gerado ou não pelo `AnalysisGeneratorService`. Se vier vazio não há como referenciar. Tornar obrigatório no momento em que a análise é gravada.

2. `ApplyRewritesDto`:

```ts
@ApiPropertyOptional({
  description: 'Rewrites a aplicar. Omitido, aplica todos os da análise.',
  type: [String],
})
@IsOptional()
@IsArray()
@IsString({ each: true })
rewriteIds?: string[];
```

3. `ResumeService.applyRewrites` filtra antes de aplicar, e `appliedCount` reflete o filtro:

```ts
const all = analysis.bulletRewrites || [];
const rewrites = rewriteIds?.length
  ? all.filter((r) => rewriteIds.includes(r.id))
  : all;

if (!rewrites.length) {
  throw new BadRequestException('No rewrites to apply');
}
```

4. Decidir o comportamento quando um id enviado não existe na análise: ignorar em silêncio ou responder 400. Preferir 400, o cliente mandou algo sem sentido.

5. Atualizar `src/application/__test__/resume.service.spec.ts` com os casos: lista vazia, subconjunto, id inexistente.

### 9.2 Upload: retorno e tempo de resposta

**Front.** `resumesApi.upload` devolve `{resume}` e o hook usa `data.resume.title` no toast, depois navega para o detalhe.

**Backend.** `POST /resumes` devolve `{resume, version, meta: {numPages}}`.

**Correção.** Ajustar `ResumeUploadResponse` no front para `{resume, version, meta}`. O `version` retornado é útil: dá para navegar direto para `/resumes/:id?version=:versionId` sem refetch.

**Detalhe importante.** O upload dispara extração de PDF **e** parse estruturado por IA (`StructuredParserService.parseResume`) de forma síncrona. Pode passar bem dos 30 segundos. O front tem `mockDelay(800)` e nenhum timeout configurado no axios. Definir timeout generoso para essa chamada (120s), ou mover o parse para background com polling. Para a primeira versão, timeout maior resolve.

Limites que o front precisa respeitar e comunicar: `MAX_UPLOAD_SIZE_BYTES` (5MB) e `ALLOWED_UPLOAD_MIME_TYPES`, ambos em `backend/src/constants.ts`. A `UploadDropzone` deve validar antes de subir, para não gastar upload em arquivo que o servidor vai recusar com 413.

### 9.3 Delete de currículo

**Front.** `useDeleteResume` recebe o id mas chama `resumesApi.remove()` sem argumento, e a façade mock ignora. Bug latente do boilerplate que vira bug real ao conectar.

**Correção.** `src/api/resumes.ts`:

```ts
remove: (id: string) => apiClient.delete(`/resumes/${id}`).then((r) => r.data),
```

E no hook, `mutationFn: (id: string) => resumesApi.remove(id)`.

### 9.4 Endpoints do backend sem consumidor

Para referência, o que existe e ninguém usa:

- `POST /api/v1/upload`: extrai texto de PDF sem criar currículo. `UploadService` continua sendo usado internamente por `ResumeService.createFromUpload`, então só o controller sairia se a decisão for remover.
- `GET /api/v1/profile/all` e `GET /api/v1/profile/admins`: rotas de admin, não há tela.
- `POST /api/v1/profile`: cria profile avulso. O fluxo real passa pela saga de registro. Rota perigosa, avaliar remoção.
- `GET /api/v1/profile/:id`: redundante com `/auth/me` para o usuário logado.
- `GET /api/v1/auth/:id`: devolve a entidade `AuthUser` crua, com `password` e `currentHashedRefreshToken`. **Risco de exposição.** Ou remove, ou passa a devolver `CurrentUser`, que já existe justamente para isso.
- `DELETE /api/v1/auth/:id`: exclusão de conta. Vale expor em `Settings.tsx` numa aba de zona de perigo, é requisito de LGPD.
- `GET /api/v1/auth/google` e `/google/redirect`: OAuth Google completo. A tela de login não tem botão. Feature pronta e desperdiçada.
- `GET /api/v1/hello`: boilerplate, remover.
- `GET /health`: health check, fora do prefixo `/api`.

---

## 10. Checklist de execução

### Fase 0: fundação, não iniciada

- [x] Corrigir target do proxy no `vite.config.js` para a porta 4000
- [x] `baseURL` do axios para `/api/v1`, lendo de `VITE_API_URL`
- [x] Criar `frontend/.env.example`
- [x] Descomentar a instância do axios em `src/api/client.ts`
- [x] Interceptor de response desembrulhando `data.data`
- [x] Interceptor de erro lendo `data.message` e `data.error.code`
- [x] Adicionar `code` ao tipo `ApiError`
- [x] Renomear `_id` para `id` em `src/types/api.ts` e propagar: feito em `User`, `Resume`, `ResumeVersion`, `Analysis` e `BulletRewrite`. Sobra `DashboardLatestResume._id`, que acompanha o mock do dashboard até ele ser ligado
- [x] Decidir sobre CORS no backend: dispensado no dev pelo proxy do Vite, decidir de novo ao publicar

### Fase 1: autenticação

- [x] Backend: `GET /api/v1/auth/me`, declarado antes de `@Get(':id')`
- [x] Backend: interface `CurrentUser`, sem expor `password` nem hash de refresh
- [x] Backend: `PATCH /api/v1/auth/password` com `{currentPassword, newPassword}`
- [x] Backend: `lastname` e `age` opcionais no `RegisterAuthDto`
- [x] Backend: `login` e `register` devolvendo `{access_token, refresh_token, user}` com `CurrentUser`
- [x] Backend: decidir entre `PATCH /auth/profile` (alias) ou manter `PUT /profile/me`: alias criado, as duas rotas coexistem
- [x] Backend: rota de perfil devolvendo `CurrentUser` em vez de `Profile`
- [x] Backend: `GET /auth/:id` parando de devolver `AuthUser` cru
- [x] Front: armazenamento de token e interceptor de request com `Authorization`
- [x] Front: retry no 401 via `/auth/refresh-token`, com guarda contra loop e fila
- [x] Front: remover `withCredentials`
- [x] Front: `authApi.me` apontando para `/auth/me`, tipo `User` com `id`, `name` nulável e `roles`
- [x] Front: `updateProfile` no path escolhido, assinatura estreitada
- [x] Front: `changePassword` descomentado, sem ajuste de campo
- [x] Front: logout limpando os tokens
- [x] Front: forçar logout depois de trocar a senha

### Fase 2: endpoints de agregação, concluída

- [x] `src/domain/entities/Version.ts` e `History.ts`
- [x] `VersionsDomainService` e `HistoryDomainService`, com testes
- [x] `findAllByResumeIds` no repositório de versões
- [x] `findAllStatsByUserId` no repositório de análises
- [x] `VersionsService` e `HistoryService`, com testes
- [x] `VersionsController` e `HistoryController`, registrados no `ApiModule`
- [x] Migrar o feed de atividade do dashboard para o `HistoryDomainService`
- [x] Front: apontar `analyticsApi.versions` e `analyticsApi.history` para os endpoints reais
- [x] Front: `VersionsListItem.score` nulável, `createdAt` e `HistoryEvent.at` opcionais

### Fase 3: nomes de rota

- [x] `@Post(':id/analyzer')` para `@Post(':id/analyze')`
- [x] `@Get(':id/analysis')` para `@Get(':id/analyses')`
- [x] Atualizar `test/app.e2e-spec.ts` se cobrir esses paths (não cobre, nada a fazer)

### Fase 4: contratos

- [x] Alinhar dashboard e insights à convenção do history: `at` e `'analyze'`
- [x] `bestScore` no read model de `GET /resumes`
- [x] `score` por versão no read model de `GET /resumes/:id`
- [x] Front: `versionCount` trocado por `latestVersionNumber`, o nome que o backend usa
- [x] Front: `ParsedSections` com todos os campos opcionais, revisando `ResumeDocument`
- [x] Front: `projects[].summary` para `description`, `certifications[].year` para string
- [x] Front: `scoreBreakdown` mantido como objeto `{keywords, formatting, impact, clarity}`, que é o que o backend devolve e o que o componente `ScoreBreakdown` sempre leu. A conversão para array foi descartada, não tinha consumidor
- [x] i18n: as chaves já existiam como `scoreBreakdown.keywords`, `.formatting`, `.impact`, `.clarity` nos dois idiomas
- [x] Front: `strengths[].note` para `evidence`
- [x] Front: `DiffResponse` alinhado a `{from, to, parts, stats}`, `hunks` removido
- [x] Backend: `kpi.issues` para `issuesIdentified` e `kpi.keywords` para `keywordsMatched`
- [x] Backend: `total` em `keywordsMatched`
- [x] Alinhar `spark[].v` com `spark[].value`: o front adotou `value`, e o `dataKey` do `StatCard` acompanhou. O sparkline não desenhava nada antes disso
- [x] Front: tratar `latestResume: null` no dashboard
- [x] Front: tratar `kpi.*.value` e `delta` nulos
- [x] Front: usar `empty` nos insights. O painel de onboarding continua sendo o `EmptyState` genérico com CTA para `/resumes`, ainda não lista `resumes[]`
- [x] Front: tratar `averageScore` e `bestScore` nulos
- [x] Definir o destino de `totals.exports`: removido do contrato até a feature existir

### Fase 5: features

- [ ] `rewriteIds` opcional no `ApplyRewritesDto`
- [ ] Filtro de rewrites no `ResumeService.applyRewrites`, com `appliedCount` correto
- [ ] `id` obrigatório em `BulletRewrite` na persistência
- [ ] Testes do rewrite seletivo
- [ ] Front: devolver a seleção por bullet ao `BulletRewrites` quando o backend aceitar `rewriteIds`. Hoje o componente aplica a análise inteira, porque era o que o `ApplyRewritesDto` aceitava; as chaves `rewrites.selected`, `.selectAll`, `.clearAll`, `.applySelected`, `.willApply` e `.skip` continuam nos dois locales esperando essa volta
- [x] Front: `remove(id)` passando o id
- [x] Front: `ResumeUploadResponse` como `{resume, version, meta}`
- [ ] Front: timeout ampliado no upload
- [ ] Front: validação de tamanho e mime na `UploadDropzone`
- [ ] Decidir sobre `POST /upload`, rotas de admin, `POST /profile` e `GET /hello`
- [ ] Avaliar ligar o OAuth Google na tela de login
- [ ] Avaliar exclusão de conta em Settings

### Encerramento

- [x] Deletar `frontend/src/mock/` inteira
- [x] Remover os comentários de "TO ENABLE THE REAL BACKEND" das façades
- [x] Remover o placeholder `apiClient = null`
- [x] `npm run build` no front. O `npm run lint` continua com 27 erros pré-existentes, nenhum nas façades nem nos tipos: `setState` dentro de efeito, `react-refresh/only-export-components` nos contexts e imports não usados na landing e no `Dashboard`
- [ ] `pnpm run lint` e `pnpm run test` no backend
- [ ] Teste e2e do fluxo completo: registro, upload, análise, rewrite, diff
- [x] Atualizar a seção "Camada de dados" do `CLAUDE.md`

---

## Anexo A: mapa completo rota a rota

Legenda: **OK** existe e o path bate, **PATH** existe em outro caminho ou verbo, **NOVO** entregue nesta rodada.

### Auth

| Front | Backend | Status | Observação |
|---|---|---|---|
| `POST /auth/register` | `POST /api/v1/auth/register` | OK | DTO exige `lastname` e `age`, retorno sem `user` |
| `POST /auth/login` | `POST /api/v1/auth/login` | OK | retorno sem `user`, sem email |
| `POST /auth/logout` | `POST /api/v1/auth/logout` | OK | exige Bearer |
| `GET /auth/me` | `GET /api/v1/auth/me` | **NOVO** | contrato bate, só `_id` para `id` |
| `PATCH /auth/profile` | `PUT /api/v1/profile/me` | PATH | campos divergentes, decidir alias |
| `PATCH /auth/password` | `PATCH /api/v1/auth/password` | **NOVO** | contrato bate exatamente |
| não usa | `POST /api/v1/auth/change-password` | | mesma operação, verbo antigo |
| não usa | `POST /api/v1/auth/refresh-token` | | necessário para o fluxo de token |
| não usa | `GET /api/v1/auth/google` | | OAuth pronto e não ligado |
| não usa | `GET /api/v1/auth/google/redirect` | | |
| não usa | `GET /api/v1/auth/:id` | | devolve `AuthUser` cru, risco |
| não usa | `DELETE /api/v1/auth/:id` | | exclusão de conta |

### Resumes

| Front | Backend | Status | Observação |
|---|---|---|---|
| `GET /resumes` | `GET /api/v1/resumes` | OK | ligado, `bestScore` e `latestVersionNumber` chegam do read model |
| `GET /resumes/:id` | `GET /api/v1/resumes/:id` | OK | ligado, `score` por versão incluído |
| `GET /resumes/:id/versions/:vId` | idem | OK | ligado, versão crua, sem `score` |
| `POST /resumes` | `POST /api/v1/resumes` | OK | ligado, `{resume, version, meta}` refletido no tipo |
| `DELETE /resumes/:id` | `DELETE /api/v1/resumes/:id` | OK | ligado, o id vai na URL |
| `POST /resumes/:id/analyze` | `POST /api/v1/resumes/:id/analyze` | OK | ligado |
| `GET /resumes/:id/analyses` | `GET /api/v1/resumes/:id/analyses` | OK | ligado |
| `GET /resumes/:id/versions/:vId/analysis` | idem | OK | ligado, `Analysis` alinhado ao backend |
| `POST /resumes/:id/rewrite` | idem | OK | ligado, só `analysisId` no corpo |
| `GET /resumes/:id/diff` | idem | OK | ligado, `mode` restrito a `words` e `lines` |
| não usa | `POST /api/v1/upload` | | sem consumidor |

### Analytics

| Front | Backend | Status | Observação |
|---|---|---|---|
| `GET /dashboard` | `GET /api/v1/dashboard` | OK | várias divergências de shape |
| `GET /insights` | `GET /api/v1/insights` | OK | falta `empty` e `resumes` no front |
| `GET /versions` | `GET /api/v1/versions` | **NOVO** | contrato bate, dois tipos a afrouxar |
| `GET /history` | `GET /api/v1/history` | **NOVO** | contrato bate, um tipo a afrouxar |

### Profile

| Front | Backend | Status |
|---|---|---|
| não usa | `GET /api/v1/profile/all` | admin |
| não usa | `GET /api/v1/profile/admins` | admin |
| não usa | `POST /api/v1/profile` | avaliar remoção |
| não usa | `GET /api/v1/profile/:id` | |
| via `updateProfile` | `PUT /api/v1/profile/me` | ver 5.5 |

### Infra

| Rota | Observação |
|---|---|
| `GET /health` | fora do prefixo `/api` |
| `GET /api/docs` | Swagger, sem versão no path, só fora de produção |
| `GET /api/v1/hello` | boilerplate, remover |
