# Rebrand: Resume Roaster para Destrava Currículo

Data: 2026-10-03
Status: pronto para execução
Referência visual: brand kit 3x3 gerado no Canva (media id `MAHW_8WEy7g`)

## 1. Objetivo

Trocar a marca "Resume Roaster", técnica e em inglês, por **Destrava Currículo**, acessível para o público brasileiro. Isso muda quatro coisas: o nome, a linguagem (fim do jargão "ATS"), o logo e a cor de destaque. A lógica do produto não muda.

## 2. Decisões já tomadas (não reabrir)

| Tema | Decisão |
|---|---|
| Nome | **Destrava Currículo** (singular). Forma curta: **Destrava**. |
| Metáfora | Destravar. O robô de triagem trava o currículo e a marca é a chave. |
| Tagline | "Destrave sua próxima oportunidade." |
| Logo | Mantém folha com dobra e feixe de scan. A faísca de IA sai e entra um **cadeado aberto âmbar** na dobra. |
| Cor | Indigo `#5360FF` continua a base. **Âmbar `#FFB020`** entra como único destaque. |
| Público | Qualquer brasileiro procurando vaga. Sai o foco exclusivo em engenheiros. |
| Tom | Amigo, claro, encorajador. Nunca acusa a pessoa, o problema é o robô e o filtro. |
| Identificadores internos | **Não renomear** `atsScore`, rotas, campos de API, tabelas e tipos. Só o que o usuário vê. |
| Regra de copy pt-BR | **Nunca usar travessão (em dash) em texto em português.** Usar vírgula, ponto ou dois-pontos. |

## 3. Glossário obrigatório (pt-BR)

Aplicar em toda string visível ao usuário. Na primeira aparição de cada página, explicar o robô: "o robô que as empresas usam para filtrar currículos".

| Antes | Depois |
|---|---|
| ATS | robô de triagem |
| Nota ATS / Prontidão ATS | Nota do currículo |
| parser, parse | como o robô lê seu currículo |
| palavras-chave | palavras da vaga |
| bullets | frases de experiência |
| reescritas com IA | sugestões de melhoria |
| diff / diferenças | o que mudou |
| Insights | O que mais trava seu currículo |
| Dashboard | Meu painel |
| exportar PDF otimizado para ATS | Baixar currículo pronto |
| Greenhouse, Lever, Workday, BambooHR | remover |

Inglês (`en`): mesma lógica, com "screening robot" no lugar de ATS, "resume score", "job keywords", "what changed", "My dashboard", "Download your resume".

## 4. Escopo por arquivo

### 4.1 Marca e nome

| Arquivo | Mudança |
|---|---|
| `frontend/src/i18n/locales/{pt-BR,en}/layout.json` | `brand`: "Destrava" (chave usada na Sidebar e Navbar). Ajustar `nav.dashboard`, `nav.insights` pelo glossário. |
| `frontend/src/i18n/locales/{pt-BR,en}/landing.json` | `brand`: "Destrava Currículo". `seo.title`, `seo.description`, `footer.copyright` e `footer.tagline` reescritos. |
| `frontend/src/i18n/locales/{pt-BR,en}/auth.json` | `badge`: remover "Resume Roaster", usar "Destrava Currículo". `subhead` de login e registro sem "ATS" e sem "bullets". |
| `frontend/src/components/auth/BrandCardMarquee.tsx` | Strings hardcoded em inglês: `"Resume Roaster"` (linhas 87 e 136), `"ATS Readiness"` (105), `"ATS scan"` (370). Mover para i18n em `auth.json` e aplicar o glossário. Renomear `AtsScoreCard` para `ResumeScoreCard`. |
| `frontend/index.html` | `<title>` de "airesumetracker" para "Destrava Currículo". Trocar `lang="en"` por `lang="pt-BR"`. Adicionar `<meta name="description">` com o texto de `seo.description`. |
| `frontend/public/favicon.svg` | Hoje é o favicon padrão do Vite. Substituir pelo ícone do novo logo (ver 4.2). |
| `frontend/package.json`, `backend/package.json`, `backend/README.md`, `backend/postman-*.json` | Atualizar nome visível e título (`destrava-curriculo-*`). Rename de pasta ou repositório fica **fora do escopo**. |
| `backend/src/infrastructure/swagger/swagger-configurator.service.ts` | Trocar as 5 ocorrências de "ATS AI Resumer" por "Destrava Currículo". |

### 4.2 Logo (`frontend/src/components/layout/AILogo.tsx`)

1. Remover o `motion.path` da faísca (linhas "AI spark").
2. Adicionar um cadeado aberto na dobra, em âmbar. Ponto de partida, a ser ajustado visualmente:
   ```tsx
   <g>
     <rect x="33.5" y="9.5" width="9" height="6.5" rx="1.6" fill="#FFB020" />
     <path d="M36 9.5V7.6a2.5 2.5 0 0 1 4.9-.6"
           stroke="#FFB020" strokeWidth="1.6" fill="none" strokeLinecap="round" />
   </g>
   ```
3. Animação opcional, só se `live`: o arco do cadeado sobe levemente quando o feixe termina a varredura. Respeitar `useReducedMotion` (já existe).
4. Atualizar o comentário do componente: "folha + feixe de scan + cadeado aberto".
5. Atualizar `aria-label`: hoje usa `t("a11y.aiOnline")`. Trocar por uma chave nova `a11y.logo` com o valor "Destrava Currículo".
6. Validar legibilidade em 24px (BrandCardMarquee) e 48px (Login, Register). Se o cadeado sumir em 24px, simplificar para um ponto âmbar.
7. Exportar o mesmo desenho estático para `public/favicon.svg`.

### 4.3 Cor de destaque (`frontend/src/index.css`)

- Adicionar em `:root`: `--brand-amber: #FFB020; --brand-amber-foreground: #3A2500;`
- Adicionar em `[data-theme="dark"]`: `--brand-amber: #FFC247;`
- Expor em `@theme`: `--color-brand-amber: var(--brand-amber);`
- **Uso restrito:** botão principal de CTA na landing, destaque da palavra-chave do título e o momento de "nota subindo". Não usar em badges semânticos nem em alertas (o laranja `--alert-*` continua só para alerta).
- Não alterar o indigo, `--accent-hero` nem os tokens semânticos de badge.

### 4.4 Landing (`frontend/src/components/landing/*` e `landing.json`)

Copy novo (pt-BR) para os blocos principais. O `en` segue a mesma ideia.

- **Hero:** título "Seu currículo está travado? A gente destrava." Subtítulo: "Muita empresa usa um robô para filtrar currículos antes de uma pessoa ler. Envie o seu, veja o que está travando e corrija em minutos." CTA primário: "Destravar meu currículo". Selos: "Sem cartão de crédito", "Nota na hora".
- **Features:** trocar "7 ferramentas" por "Tudo para chegar na entrevista". Renomear os 7 itens pelo glossário. Remover a menção a Greenhouse, Lever e Workday.
- **HowItWorks:** 3 passos: "Envie seu currículo", "Veja o que está travando", "Corrija e baixe pronto". Strings hardcoded em inglês nas linhas 48, 127 e 136 de `HowItWorks.tsx` passam para i18n ("regras do robô checadas", "Pronto para o robô, 1 página", "Nota 86").
- **DashboardPreviewSection e HeroDashboardPreview:** strings hardcoded (`"ATS Score"`, `"Format & ATS parsing"`, `"ATS Readiness"`) vão para i18n com os termos do glossário.
- **CTA final:** "Veja o que o robô enxerga no seu currículo." Botão: "Destravar agora".
- **Footer:** tagline "Seu currículo, destravado para a próxima oportunidade." Coluna Recursos: "Guia de ATS" vira "Como o robô filtra currículos". Remover links que não existem (Blog, Carreiras, Imprensa) se não houver destino. Verificar antes.
- **Testimonials:** **remover a seção** (`TestimonialsSection.tsx`, o uso em `pages/Landing.tsx` e o bloco `testimonials` das duas locales). Os depoimentos são fictícios. Reintroduzir só com depoimentos reais.
- **Benefits:** reescrever sem a promessa de parsers específicos e sem "Resultados reais de engenheiros".

### 4.5 App autenticado

| Arquivo | Mudança |
|---|---|
| `i18n/locales/*/dashboard.json` | 7 ocorrências de ATS: aplicar glossário. `atsGauge.title` vira "Nota do currículo". |
| `i18n/locales/*/insights.json` | Título da página "O que mais trava seu currículo". KPIs sem "ATS". |
| `i18n/locales/*/resumes.json` | Linha 62 (`"ats": "ATS"`) vira "Nota". Linha 117 "amigável ao ATS" vira "pronto para o robô de triagem". |
| `i18n/locales/*/analysis.json` | Aplicar glossário (palavras da vaga, frases de experiência, sugestões de melhoria). |
| `src/hooks/useResumes.ts:91` | Mensagem `ATS score ... / 100` passa para i18n: "Nota do currículo: X de 100". |
| `src/pages/Versions.tsx` | Usa `versions.ats`, atualizar a chave nas locales. |
| `topbar.subtitle`, `searchPlaceholder` | Remover "palavras-chave" e "reescritas". |

### 4.6 Backend (texto que o usuário vê)

- `backend/src/infrastructure/ai/analysis-generator.service.ts`: nos prompts pt-BR e en, adicionar a instrução de **não usar a sigla ATS nem o termo "bullet" nas respostas** e usar "robô de triagem", "frases de experiência" e "palavras da vaga". Manter o schema e os campos (`atsScore` etc.) inalterados. Trocar a persona para "recrutador sênior e especialista em triagem de currículos".
- `backend/src/domain/services/history-domain.service.ts:108`: `ATS score X / 100` é texto exibido no histórico, mudar para "Nota do currículo X / 100". Atualizar o teste `history-domain.service.spec.ts` junto.
- Não tocar em `insights-domain.service.ts` (só comentários e campos internos).

## 5. Afirmações a corrigir ou remover (precisam ser verdade)

Estas frases estão no copy atual e não são sustentadas pelo código. Remover ou reescrever, salvo se alguém confirmar o contrário:

1. "Testado contra parsers Greenhouse, Lever e Workday": a nota vem de um prompt para o Gemini.
2. "Seu PDF nunca é armazenado ou compartilhado": o backend persiste currículos e versões.
3. "Sem cadastro obrigatório na primeira análise": todas as rotas de análise exigem login.
4. "Grátis para sempre, analise seus 3 primeiros currículos": verificar se existe limite no código, senão remover o número.
5. Depoimentos e "resultados reais": fictícios, removidos no item 4.4.

## 6. Fora do escopo

- Renomear pasta, repositório, banco, rotas, campos de API e chaves de `localStorage` (`ats.access_token` e `ats.refresh_token` ficam, trocar deslogaria todos os usuários).
- Novos produtos (LinkedIn, Entrevistas) e pacotes pagos.
- Registro de domínio e INPI (ação do dono do produto, ver seção 8).

## 7. Ordem de execução

1. Tokens de cor e `AILogo` + favicon (base visual).
2. Locales `layout`, `auth`, `landing` (pt-BR e en juntas).
3. Strings hardcoded para i18n (`BrandCardMarquee`, `HowItWorks`, `DashboardPreviewSection`, `HeroDashboardPreview`, `useResumes`).
4. Remoção do Testimonials e limpeza das afirmações da seção 5.
5. Locales do app: `dashboard`, `insights`, `resumes`, `analysis`, `settings`.
6. Backend: prompts da IA, `history-domain.service` + teste, Swagger.
7. `index.html`, `package.json`, README, Postman.

Um commit por etapa, mensagem em inglês no padrão `refactor: ...` / `feat: ...` já usado no repositório.

## 8. Critérios de aceite

- `grep -rniE "roaster|ats-ai-resumer|ai resumer"` em `frontend/src`, `frontend/index.html` e `backend/src` não retorna nada visível ao usuário.
- `grep -rniE "\bATS\b"` nas locales `pt-BR` e `en` só retorna a explicação inicial do robô de triagem, se houver.
- Nenhuma string visível ao usuário está hardcoded em inglês nos componentes listados.
- Nenhum travessão (em dash) em arquivos de `pt-BR`.
- Chaves de `pt-BR` e `en` batem entre si (mesmo conjunto de chaves em cada arquivo).
- Logo renderiza nítido em 24px e 48px, claro e escuro, e respeita `prefers-reduced-motion`.
- Âmbar aparece apenas nos usos de 4.3. O resto da paleta fica igual.
- `npm run build` no frontend e `npm test` no backend passam, incluindo o teste do histórico atualizado.
- Verificação visual no navegador de: landing, login, registro, painel, detalhe de currículo, insights e versões, em pt-BR e en, claro e escuro.

## 9. Pendências do dono do produto (antes de publicar)

- Checar disponibilidade de domínio (`destravacurriculo.com.br`), @ nas redes e busca no INPI por "Destrava".
- Confirmar o limite gratuito real (afirmação 4 da seção 5).
- Definir se existirá página de Preços, Blog e Carreiras, ou se os links saem do rodapé e da navbar.
