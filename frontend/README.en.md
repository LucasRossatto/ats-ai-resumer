# Destrava Currículo (frontend)

**English** | [Português](README.md)

The web interface of Destrava Currículo: the user uploads a resume, sees the ATS compatibility analysis, compares versions, rewrites passages and exports the result as a PDF. This package consumes the backend API (`../backend`).

## Stack

- React 19 and React Router 7
- Vite 8 and TypeScript 6
- Tailwind CSS 4 (`@tailwindcss/vite` plugin), `class-variance-authority`, `tailwind-merge`, `framer-motion`
- TanStack Query (react-query) for server data
- i18next and react-i18next (pt-BR and en)
- Vitest and Testing Library for tests
- Axios, Recharts, `@react-pdf/renderer`, `react-dropzone`, `lucide-react`

## Environment variables

Copy `.env.example` to `.env` if you need to change anything.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend origin. Leave it empty in development (the Vite proxy handles `/api`). In production, set the API host, with no trailing slash and no `/api/v1`, which the client already appends. |

## Running

Requires Node and pnpm.

```bash
pnpm install
pnpm dev
```

The app starts at `http://localhost:5173`. The backend must be running at `http://localhost:4000`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite development server |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serves the build locally |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (`vitest run`) |

## Structure

```
frontend/
  docs/            frontend notes and documents
  public/          favicon and icons
  src/
    api/           HTTP client (axios) and per-domain calls
    assets/        static images
    components/    analysis, auth, dashboard, export, landing, layout, resume, ui
    context/       AuthContext, ThemeContext, UIContext (and their hooks)
    hooks/         react-query hooks (useAnalytics, useDashboard, useResumes)
    i18n/          i18next setup and locales (pt-BR, en)
    lib/           utilities (utils.ts)
    pages/         screens, one per route
    test/          Vitest setup
    types/         API and shared types
    routes.tsx     route definitions
    main.tsx       entry point
```

## Decisions

- **Session**: the access token lives only in memory (`tokenStore`) and the refresh token is an `httpOnly` cookie sent by the backend. When the page loads, the session is restored by calling the refresh endpoint. No token in `localStorage`.
- **Google login**: `GoogleSignIn.tsx` (in `Login.tsx` and `Register.tsx`) is a link to `/api/v1/auth/google`, because the backend answers with a redirect. On the way back, the backend sets the refresh cookie and sends the browser to `/auth/callback` (`AuthCallback.tsx`), which restores the session. It needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` on the backend.
- **react-query** for all server state; the hooks in `src/hooks` wrap the calls in `src/api`.
- **i18n pt-BR and en**: texts live in JSON files per namespace under `src/i18n/locales/<language>`. The default (fallback) language is pt-BR, and there is a language switcher in the layout.
- **Light and dark theme**: `ThemeContext` saves the choice in `localStorage` (key `arr-theme`), uses the system preference as the initial value, and sets the `data-theme` attribute on `<html>`.
- **Vite proxy in development**: `/api` is forwarded to `http://localhost:4000`, so everything is same-origin and the backend does not need to allow CORS in dev.
- **TypeScript**: `strict` is off for now; `pnpm typecheck` validates what is already typed.
