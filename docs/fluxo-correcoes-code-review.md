# Fluxo de Correção - Code Review (8 Achados)

Data: 2026-08-08
Branch: dev
Status: Pendente de Implementação

---

## Resumo Executivo

8 issues identificadas durante revisão de código. Classificadas por severidade:
- **CRÍTICO** (1): Validação de env vars para Gemini
- **ALTO** (4): Lançamento de Error simples em vez de exceções NestJS
- **MÉDIO** (3): Logging com console.log e documentação Swagger

Tempo estimado total: 30-45 minutos

---

## Issue #1: CRÍTICO - Validação GEMINI_API_KEY no bootstrap

**Arquivo**: `backend/src/constants.ts`  
**Linha**: 18  
**Prioridade**: CRÍTICA  
**Risco**: Produção pode iniciar sem chave de API, falhas aleatórias em request time

### Problema
```typescript
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
```

Falta validação. Diferente de `EMAIL_ENCRYPTION_KEY` que valida ao iniciar.

### Solução
Adicionar validação de startup para `GEMINI_API_KEY` (e `GEMINI_MODEL` se crítico em produção):

```typescript
// Encryption Constants
if (!process.env.EMAIL_ENCRYPTION_KEY) {
  throw new Error(
    'FATAL ERROR: EMAIL_ENCRYPTION_KEY is not defined in environment variables.',
  );
}
if (!process.env.EMAIL_BLIND_INDEX_SECRET) {
  throw new Error(
    'FATAL ERROR: EMAIL_BLIND_INDEX_SECRET is not defined in environment variables.',
  );
}
export const EMAIL_ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
export const EMAIL_BLIND_INDEX_SECRET = process.env.EMAIL_BLIND_INDEX_SECRET;

// Gemini Constants (novo)
if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'FATAL ERROR: GEMINI_API_KEY is not defined in environment variables.',
  );
}
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
```

### Checklist
- [ ] Modificar `backend/src/constants.ts` (adicionar validação GEMINI_API_KEY)
- [ ] Testar com `pnpm run start` sem GEMINI_API_KEY definida (deve falhar)
- [ ] Testar com GEMINI_API_KEY definida (deve iniciar)

---

## Issue #2-5: ALTO - Lançamentos de Error Simples

**Prioridade**: ALTA  
**Impacto**: Quebra contrato de tratamento de erro, HTTP status codes incorretos

### Issue #2: profile.service.ts linha 29

**Arquivo**: `backend/src/application/services/profile.service.ts`  
**Linha**: 29  
**Cenário**: Perfil já existe para usuário

#### Problema
```typescript
if (!this.profileDomainService.canCreateProfile(existingProfile)) {
  throw new Error('Profile already exists for this user');  // ❌ Error simples
}
```

#### Solução
```typescript
import { ConflictException, Inject, Injectable } from '@nestjs/common';

// ...

if (!this.profileDomainService.canCreateProfile(existingProfile)) {
  throw new ConflictException('Profile already exists for this user');  // ✅ ConflictException
}
```

### Issue #3: profile.service.ts linha 71

**Arquivo**: `backend/src/application/services/profile.service.ts`  
**Linha**: 71  
**Cenário**: Perfil não encontrado durante atualização

#### Problema
```typescript
const profile = await this.repository.findByAuthId(requestingUserId);
if (!profile) {
  throw new Error('Profile not found for current user');  // ❌ Error simples
}
```

#### Solução
```typescript
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

// ...

const profile = await this.repository.findByAuthId(requestingUserId);
if (!profile) {
  throw new NotFoundException('Profile not found for current user');  // ✅ NotFoundException
}
```

### Issue #4: auth.service.ts linha 68

**Arquivo**: `backend/src/application/services/auth.service.ts`  
**Linha**: 68  
**Cenário**: Falha de verificação de consistência após criação

#### Problema
```typescript
throw new Error('Registration failed - user not found after creation');  // ❌ Error simples
```

#### Solução
```typescript
import { InternalServerErrorException } from '@nestjs/common';

// ...

throw new InternalServerErrorException('Registration failed - user not found after creation');  // ✅ InternalServerErrorException
```

### Issue #5: auth.service.ts linha 470

**Arquivo**: `backend/src/application/services/auth.service.ts`  
**Linha**: 470  
**Cenário**: Email duplicado no fluxo OAuth

#### Problema
```typescript
throw new Error('User already exists with this email');  // ❌ Error simples
```

#### Solução
```typescript
import { ConflictException } from '@nestjs/common';

// ...

throw new ConflictException('User already exists with this email');  // ✅ ConflictException
```

### Checklist para Issues #2-5
- [ ] Adicionar imports corretos de `@nestjs/common` em ambos os arquivos
- [ ] Substituir `Error` por exceções corretas (ConflictException, NotFoundException, InternalServerErrorException)
- [ ] Rodar testes: `pnpm run test`
- [ ] Testar manualmente cenários de erro (criar perfil duplicado, etc)
- [ ] Verificar que HTTP status codes estão corretos via Swagger

---

## Issue #6-7: MÉDIO - console.log em Bootstrap

**Arquivo**: `backend/src/main.ts`  
**Linhas**: 67, 68  
**Prioridade**: MÉDIA  
**Impacto**: Inconsistência de logging, falta de contexto estruturado

### Problema
```typescript
const docsUrl = `${url}/${API_BASE_PATH}/docs`;
console.log(`Application is running on: ${url}`);          // ❌ console.log
console.log(`Swagger documentation available at: ${docsUrl}`);  // ❌ console.log
```

### Solução

Opção A: Usar LoggerService (requer injeção, mais complexo no bootstrap)
Opção B: Usar logger do NestJS (já disponível, mais simples)

**Recomendação**: Opção B (mais simples e alinhado com NestJS)

```typescript
import { Logger } from '@nestjs/common';

// ...

async function bootstrap() {
  const logger = new Logger('Bootstrap');  // ✅ Logger do NestJS
  const app = await NestFactory.create(AppModule);

  // ... resto do código ...

  await app.listen(APP_PORT);

  const url = (await app.getUrl()).replace(
    /\/\/(\[::1?\]|0\.0\.0\.0|127\.0\.0\.1)/,
    '//localhost',
  );
  const docsUrl = `${url}/${API_BASE_PATH}/docs`;
  logger.log(`Application is running on: ${url}`);        // ✅ Logger.log()
  logger.log(`Swagger documentation available at: ${docsUrl}`);  // ✅ Logger.log()
}
```

### Checklist
- [ ] Importar `Logger` de `@nestjs/common` em `main.ts`
- [ ] Instanciar `const logger = new Logger('Bootstrap');`
- [ ] Substituir `console.log` por `logger.log()`
- [ ] Testar: `pnpm run start:dev` e verificar output
- [ ] Verificar que mensagens ainda aparecem (Logger padrão do NestJS)

---

## Issue #8: MÉDIO - Documentação Swagger Incompleta

**Arquivo**: `backend/src/api/controllers/profile.controller.ts`  
**Linha**: 83  
**Prioridade**: MÉDIA  
**Impacto**: Swagger docs incompletos, possíveis surpresas para clientes da API

### Problema
```typescript
@Post('')
@ApiOperation({ summary: 'Create a new user' })
@ApiResponse({
  status: 201,
  description: 'The user has been successfully created',
  type: Profile,
})
async create(
  @Body() profile: CreateProfileDto,
): Promise<SuccessResponseDto<Profile>> {
  // ...
}
```

Faltam respostas de erro explícitas:
- 401 (Unauthorized) - herdado de `@UseGuards(AuthGuard('jwt'))` mas deve ser explícito
- 409 (Conflict) - quando perfil já existe (lançado em profile.service.ts linha 29)
- 400 (Bad Request) - validação de DTO falha

### Solução
```typescript
@Post('')
@ApiOperation({ summary: 'Create a new user' })
@ApiResponse({
  status: 201,
  description: 'The user has been successfully created',
  type: Profile,
})
@ApiResponse({
  status: 400,
  description: 'Invalid profile data (validation failed)',
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized (missing or invalid JWT token)',
})
@ApiResponse({
  status: 409,
  description: 'Conflict (profile already exists for this user)',
})
async create(
  @Body() profile: CreateProfileDto,
): Promise<SuccessResponseDto<Profile>> {
  // ...
}
```

### Checklist
- [ ] Adicionar `@ApiResponse` para 400, 401, 409 no POST `/profile`
- [ ] Revisar outros endpoints em profile.controller.ts para padrão consistente
- [ ] Testar: acessar `http://localhost:4000/api/docs` e verificar endpoint
- [ ] Verificar que documentação agora lista todas as respostas possíveis

---

## Plano de Execução Recomendado

### Fase 1: Setup (5 min)
1. Checkout para branch feature: `git checkout -b fix/code-review-issues`
2. Criar commits pequenos por issue para rastreabilidade

### Fase 2: Issues Críticas (10 min)
1. **Issue #1**: Validação GEMINI_API_KEY em constants.ts
   - Commit: `fix: add GEMINI_API_KEY validation at startup`

### Fase 3: Issues Alto Impacto (15 min)
2. **Issues #2-5**: Substituir Error por exceções NestJS
   - Arquivo: `profile.service.ts`
     - Commit: `fix: use ConflictException and NotFoundException in ProfileService`
   - Arquivo: `auth.service.ts`
     - Commit: `fix: use ConflictException and InternalServerErrorException in AuthService`

### Fase 4: Issues Médio Impacto (10 min)
3. **Issues #6-7**: console.log → Logger
   - Commit: `fix: replace console.log with Logger in main.ts`

4. **Issue #8**: Documentação Swagger
   - Commit: `docs: add missing @ApiResponse decorators to profile.controller`

### Fase 5: Validação (5 min)
5. Rodar testes: `pnpm run test`
6. Rodar linter: `pnpm run lint`
7. Testar manualmente: `pnpm run start:dev`
8. Acessar Swagger: `http://localhost:4000/api/docs`

### Fase 6: PR (5 min)
9. Push: `git push origin fix/code-review-issues`
10. Criar PR contra `main` com descrição das correções

---

## Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Rodar testes
pnpm run test

# Verificar linter
pnpm run lint

# Iniciar em desenvolvimento
pnpm run start:dev

# Build produção
pnpm run build

# Verificar um único teste
pnpm run test -- src/application/__test__/profile.service.spec.ts
```

---

## Arquivos Afetados

- `backend/src/constants.ts` (Issue #1)
- `backend/src/application/services/profile.service.ts` (Issues #2, #3)
- `backend/src/application/services/auth.service.ts` (Issues #4, #5)
- `backend/src/main.ts` (Issues #6, #7)
- `backend/src/api/controllers/profile.controller.ts` (Issue #8)

**Total de linhas a modificar**: ~20 linhas de código + 10 linhas de decoradores

---

## Critério de Aceição

Cada fix deve atender:
- [ ] Código compila sem erros (`pnpm run build`)
- [ ] Linter passa (`pnpm run lint`)
- [ ] Testes passam (`pnpm run test`)
- [ ] Aplicação inicia sem warnings (`pnpm run start:dev`)
- [ ] Swagger UI mostra documentação correta
- [ ] Comportamento de erro é testável manualmente

---

## Notas Importantes

1. **Architecture Compliance**: Todas as correções mantêm conformidade com CLAUDE.md
2. **Backward Compatibility**: Mudanças são transparentes para clientes (mesmos status codes HTTP, apenas formatação correta agora)
3. **No Breaking Changes**: Clientes que já tratam HTTP 409, 404, 500 não serão afetados
4. **Logging Consistency**: Alinha com padrão de logging definido em CLAUDE.md

---

## Status de Implementação

- [ ] Issue #1: CRÍTICO - Validação GEMINI_API_KEY
- [ ] Issue #2: ALTO - ConflictException em profile.service linha 29
- [ ] Issue #3: ALTO - NotFoundException em profile.service linha 71
- [ ] Issue #4: ALTO - InternalServerErrorException em auth.service linha 68
- [ ] Issue #5: ALTO - ConflictException em auth.service linha 470
- [ ] Issue #6: MÉDIO - Logger em main.ts linha 67
- [ ] Issue #7: MÉDIO - Logger em main.ts linha 68
- [ ] Issue #8: MÉDIO - @ApiResponse em profile.controller linha 83
- [ ] Testes passam
- [ ] Linter passa
- [ ] PR criada e revisada

---

**Responsável**: Code Review  
**Data Criação**: 2026-08-08  
**Data Previsão**: 2026-08-09  
**Revisado por**: -
