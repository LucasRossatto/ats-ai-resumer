# Destrava Currículo (frontend)

[English](README.en.md) | **Português**

Interface web do Destrava Currículo: o usuário envia um currículo, vê a análise de compatibilidade com ATS, compara versões, reescreve trechos e exporta o resultado em PDF. Este pacote consome a API do backend (`../backend`).

## Stack

- React 19 e React Router 7
- Vite 8 e TypeScript 6
- Tailwind CSS 4 (plugin `@tailwindcss/vite`), `class-variance-authority`, `tailwind-merge`, `framer-motion`
- TanStack Query (react-query) para dados do servidor
- i18next e react-i18next (pt-BR e en)
- Vitest e Testing Library para testes
- Axios, Recharts, `@react-pdf/renderer`, `react-dropzone`, `lucide-react`

## Variáveis de ambiente

Copie `.env.example` para `.env` se precisar alterar algo.

| Variável | Uso |
| --- | --- |
| `VITE_API_URL` | Origem do backend. Deixe vazio em desenvolvimento (o proxy do Vite cuida de `/api`). Em produção, informe o host da API, sem barra no fim e sem `/api/v1`, que o cliente já acrescenta. |

## Como rodar

Requer Node e pnpm.

```bash
pnpm install
pnpm dev
```

A aplicação sobe em `http://localhost:5173`. O backend precisa estar em `http://localhost:4000`.

## Scripts

| Script | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento do Vite |
| `pnpm build` | Build de produção em `dist/` |
| `pnpm preview` | Serve o build localmente |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (`vitest run`) |

## Estrutura

```
frontend/
  docs/            notas e documentos do front
  public/          favicon e ícones
  src/
    api/           cliente HTTP (axios) e chamadas por domínio
    assets/        imagens estáticas
    components/    analysis, auth, dashboard, export, landing, layout, resume, ui
    context/       AuthContext, ThemeContext, UIContext (e seus hooks)
    hooks/         hooks do react-query (useAnalytics, useDashboard, useResumes)
    i18n/          configuração do i18next e locales (pt-BR, en)
    lib/           utilitários (utils.ts)
    pages/         telas, uma por rota
    test/          setup do Vitest
    types/         tipos da API e comuns
    routes.tsx     definição das rotas
    main.tsx       ponto de entrada
```

## Decisões

- **Sessão**: o access token fica só em memória (`tokenStore`) e o refresh token é um cookie `httpOnly` enviado pelo backend. Ao carregar a página, a sessão é restaurada chamando o endpoint de refresh. Nada de token em `localStorage`.
- **Login com Google**: `GoogleSignIn.tsx` (em `Login.tsx` e `Register.tsx`) é um link para `/api/v1/auth/google`, porque o backend responde com um redirect. Na volta, o backend define o cookie de refresh e leva o navegador a `/auth/callback` (`AuthCallback.tsx`), que restaura a sessão. Precisa de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALLBACK_URL` no backend.
- **react-query** para todo estado vindo do servidor; os hooks em `src/hooks` encapsulam as chamadas de `src/api`.
- **i18n pt-BR e en**: textos em arquivos JSON por namespace em `src/i18n/locales/<idioma>`. O idioma padrão (fallback) é pt-BR e há um seletor de idioma no layout.
- **Tema claro e escuro**: `ThemeContext` grava a escolha em `localStorage` (chave `arr-theme`), usa a preferência do sistema como valor inicial e aplica o atributo `data-theme` no `<html>`.
- **Proxy do Vite em desenvolvimento**: `/api` é encaminhado para `http://localhost:4000`, então tudo fica na mesma origem e o backend não precisa liberar CORS no dev.
- **TypeScript**: `strict` está desligado por enquanto; `pnpm typecheck` valida o que já está tipado.
