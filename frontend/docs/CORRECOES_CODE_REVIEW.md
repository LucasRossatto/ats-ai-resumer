# Fluxo de Correção das Issues de Code Review

## Resumo das Issues Encontradas

4 problemas foram identificados na revisão de código. Este documento descreve o fluxo de correção para cada um.

---

## Issue #1: Logout endpoint ausente da lista NO_REFRESH

**Severidade:** Alta  
**Arquivo:** `frontend/src/api/client.ts` (linha 62)  
**Status:** CONFIRMADO

### Problema
O endpoint `/auth/logout` não está na lista `NO_REFRESH`, permitindo que tentativas de atualização de token sejam acionadas quando logout retorna 401. Isso causa chamadas de rede desnecessárias e viola a intenção de "encerrar a sessão seja qual for a resposta do servidor".

### Impacto
- Chamadas de rede desnecessárias durante logout
- Complexidade adicional no fluxo de logout
- Possíveis erros de timing em testes

### Passos de Correção

1. Abrir `frontend/src/api/client.ts`
2. Localizar a definição de `NO_REFRESH` (linha 62):
   ```typescript
   const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh-token"];
   ```
3. Adicionar `/auth/logout` à lista:
   ```typescript
   const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh-token", "/auth/logout"];
   ```
4. Testar:
   - Verificar que logout completa sem tentar refresh
   - Testar logout com sessão expirada
   - Validar que tokens são limpos mesmo com erro

---

## Issue #2: Detecção de envelope baseada apenas em campo 'message'

**Severidade:** Média  
**Arquivo:** `frontend/src/api/client.ts` (linha 112)  
**Status:** PLAUSÍVEL

### Problema
A lógica de desembrulho de envelope verifica apenas a presença do campo `message`, sem validar a estrutura completa. Se um endpoint retornar um objeto com campo `message` mas sem `data`, o desembrulho resultará em `undefined`.

### Impacto
- Possíveis null pointer exceptions em handlers `.then()`
- Difícil de debugar se novos endpoints forem adicionados com estruturas diferentes
- Falta de validação robusta da resposta

### Passos de Correção

1. Abrir `frontend/src/api/client.ts`
2. Localizar o interceptor de resposta de sucesso (linha 105-115)
3. Melhorar a validação do envelope:
   ```typescript
   apiClient.interceptors.response.use(
     (response) => {
       const body = response.data;
       // Validação mais robusta: verifica se é um envelope válido
       if (
         body && 
         typeof body === "object" && 
         "message" in body &&
         "data" in body  // ← Adicionar verificação
       ) {
         response.data = (body as Envelope<unknown>).data;
       }
       return response;
     },
     // ... resto do handler
   );
   ```
4. Alternativa: Adicionar logging para detectar respostas inesperadas:
   ```typescript
   if (body && typeof body === "object" && "message" in body && !("data" in body)) {
     console.warn("Envelope mal formado:", body);
   }
   ```
5. Testar:
   - Validar que respostas válidas são desembrulhadas corretamente
   - Testar comportamento com respostas malformadas
   - Adicionar testes unitários para o interceptor

---

## Issue #3: tokenStore.save() retém token de refresh antigo

**Severidade:** Alta (segurança)  
**Arquivo:** `frontend/src/api/client.ts` (linha 29-31)  
**Status:** CONFIRMADO

### Problema
Quando `tokenStore.save()` é chamado com um refresh token falsy (null, undefined), o token antigo não é removido. Isso pode deixar um token comprometido em localStorage.

### Impacto
- Risco de segurança: token comprometido pode ser reutilizado
- Violação do princípio de menor privilégio
- Comportamento não explícito e passível de erro

### Passos de Correção

1. Abrir `frontend/src/api/client.ts`
2. Localizar `tokenStore.save()` (linha 29-31):
   ```typescript
   save(access: string, refresh?: string) {
     localStorage.setItem(ACCESS_KEY, access);
     if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
   },
   ```
3. Refatorar para sempre atualizar o refresh token:
   ```typescript
   save(access: string, refresh?: string) {
     localStorage.setItem(ACCESS_KEY, access);
     // Sempre atualizar refresh token, mesmo se falsy
     if (refresh) {
       localStorage.setItem(REFRESH_KEY, refresh);
     } else {
       // Se não há novo refresh token, remover o antigo
       localStorage.removeItem(REFRESH_KEY);
     }
   },
   ```
4. Alternativa mais segura - exigir ambos:
   ```typescript
   save(access: string, refresh: string) {
     if (!access || !refresh) {
       throw new Error("Both access and refresh tokens are required");
     }
     localStorage.setItem(ACCESS_KEY, access);
     localStorage.setItem(REFRESH_KEY, refresh);
   },
   ```
5. Se usar segunda opção, atualizar chamadas:
   - Em `auth.ts` linha 33: `tokenStore.save(session.access_token, session.refresh_token);` ✓ Já válido
   - Verificar outras chamadas a `tokenStore.save()`
6. Testar:
   - Verificar que refresh token é sempre válido
   - Testar comportamento com resposta sem refresh token
   - Validar que tokens comprometidos são removidos

---

## Issue #4: Inconsistência de tipo em resumesApi.list()

**Severidade:** Média  
**Arquivo:** `frontend/src/api/resumes.ts` (linha 28)  
**Status:** CONFIRMADO

### Problema
A anotação de tipo `ResumeListItem[]` não corresponde ao que é retornado (que é envolto em um objeto `{resumes: ...}`). Isso causa inconsistência de tipos e obscurece a intenção.

### Impacto
- Confusão sobre o contrato da API
- Possível quebra se estrutura backend mudar
- Inconsistência com padrão usado em `getVersion()`

### Passos de Correção

**Opção 1: Corrigir anotação de tipo** (mais simples)

1. Abrir `frontend/src/api/resumes.ts`
2. Localizar `list()` (linha 26-29):
   ```typescript
   list: (): Promise<ResumesListResponse> =>
     apiClient
       .get<ResumeListItem[]>("/resumes")
       .then((r) => ({ resumes: r.data ?? [] })),
   ```
3. Mudar anotação para refletir o que o backend retorna:
   ```typescript
   list: (): Promise<ResumesListResponse> =>
     apiClient
       .get<ResumesListResponse>("/resumes")  // ← Mudar tipo
       .then((r) => r.data),  // ← Simplificar handler
   ```
4. Se isso não funcionar (backend retorna array), fazer opção 2

**Opção 2: Manter estrutura atual mas documentar** (se backend realmente retorna array)

1. Adicionar comentário explicativo:
   ```typescript
   /**
    * Backend retorna um array direto, frontend envolve em ResumesListResponse.
    * Diferente de get() que retorna ResumesListResponse já envolvido.
    */
   list: (): Promise<ResumesListResponse> =>
     apiClient
       .get<ResumeListItem[]>("/resumes")
       .then((r) => ({ resumes: r.data ?? [] })),
   ```

**Opção 3: Padronizar todos endpoints** (melhor longo prazo)

1. Verificar com backend qual é a estrutura real retornada
2. Se todos endpoints retornam ResumesListResponse:
   ```typescript
   list: (): Promise<ResumesListResponse> =>
     apiClient
       .get<ResumesListResponse>("/resumes")
       .then((r) => r.data),
   ```
3. Se todos endpoints retornam dados brutos:
   ```typescript
   get: (id: string) =>
     apiClient
       .get<Resume>(`/resumes/${id}`)
       .then((r) => ({ resume: r.data, versions: ... })),
   ```

5. Testar:
   - Validar que `list()` retorna `ResumesListResponse`
   - Verificar TypeScript types estão corretos
   - Testar chamada de `useResumesList()` hook

---

## Ordem de Prioridade de Correção

1. **Issue #3** (tokenStore.save) - Segurança, deve ser corrigido primeiro
2. **Issue #1** (logout NO_REFRESH) - Alta impacto, simples de corrigir
3. **Issue #4** (tipos resumes) - Qualidade de código, médio impacto
4. **Issue #2** (envelope detection) - Prevenção de problemas futuros

---

## Checklist de Validação

Após cada correção, executar:

```bash
# TypeScript validation
npm run type-check

# Testes
npm run test

# Linting
npm run lint

# Build
npm run build
```

## Teste Manual

1. **Logout Flow:**
   - Login
   - Logout com token válido
   - Logout com token expirado
   - Logout sem conexão

2. **Token Refresh:**
   - Sessão com token expirado
   - Requisição que dispara refresh
   - Refresh com refresh token expirado

3. **Resumes List:**
   - Carregar lista de resumes
   - Validar tipos TypeScript
   - Verificar dados retornados

---

## Documentação de Teste

Criar testes unitários:

**frontend/src/api/__test__/client.spec.ts:**
- Validar NO_REFRESH inclui logout
- Testar envelope detection
- Testar tokenStore.save com valores falsy

**frontend/src/api/__test__/resumes.spec.ts:**
- Validar tipos de retorno
- Testar estrutura de ResumesListResponse

---

## Referências

- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [JWT Refresh Token Pattern](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [TypeScript Strict Null Checks](https://www.typescriptlang.org/tsconfig#strictNullChecks)
