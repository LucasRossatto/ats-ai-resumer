# Deploy gratuito: Vercel + Render + MongoDB Atlas

Este guia coloca o Destrava Currículo no ar sem custo, usando:

| Camada | Serviço | O que roda |
|---|---|---|
| Banco | MongoDB Atlas (cluster Free) | MongoDB |
| Backend | Render (Web Service, plano Free) | `backend/Dockerfile` |
| Frontend | Vercel (plano Hobby) | `frontend/` (Vite) |

Os limites dos planos gratuitos mudam. Confirme nas páginas oficiais antes de depender deles. Os valores abaixo foram conferidos em novembro de 2026.

## O que é de cada um

As etapas de criar conta, aceitar termos e digitar senhas ou chaves são **suas**. Ninguém (nem um assistente) deve fazer isso por você. Segredos ficam só nos painéis dos serviços, nunca no repositório.

## Antes de começar

- O código precisa estar no GitHub, na branch que você vai publicar (`main`).
- Gere os segredos de produção no seu computador. Um comando por segredo, com Node (funciona em qualquer sistema):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Rode **cinco vezes** e guarde cada saída com um nome: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_ENCRYPTION_KEY`, `EMAIL_BLIND_INDEX_SECRET` e a senha do usuário do banco. Cada um tem 64 caracteres hexadecimais, o que atende ao mínimo de 32 dos JWTs e ao formato exato (64 hex) da chave de e-mail. Use valores **diferentes** entre si e diferentes dos do seu `.env` local.

- Pegue a chave do Gemini em https://aistudio.google.com/apikey (`GEMINI_API_KEY`).

## Visão da arquitetura

```
Navegador ──> Vercel (frontend + regra de rewrite /api/*)
                       │
                       ▼
                Render (API NestJS)  ──>  MongoDB Atlas
                       │
                       ▼
                    Gemini
```

O frontend chama `/api/v1/...` no **mesmo domínio** da Vercel, e a Vercel repassa essas chamadas para o Render. Para o navegador há um domínio só. Por isso o cookie do refresh token funciona com `SameSite=lax`, sem configuração de domínios cruzados.

---

## Passo 1: MongoDB Atlas

1. Crie a conta em https://www.mongodb.com/cloud/atlas e um projeto.
2. **Create a cluster** e escolha o plano **Free**. Região: a mais próxima do Render (por exemplo, `us-east` se o Render ficar em Ohio ou Virginia).
3. **Database Access** > **Add New Database User**:
   - método Password, usuário `destrava` e a senha que você gerou;
   - permissão **Read and write to any database** (ou restrita ao banco `destrava`).
   - Use senha só com letras e números (os 64 hex servem). Caracteres como `@` ou `/` quebram a URI se não forem codificados.
4. **Network Access** > **Add IP Address** > **Allow access from anywhere** (`0.0.0.0/0`). O Render gratuito não tem IP fixo, então não dá para restringir. Com senha forte e um usuário só do projeto, isso é aceitável para uma demo.
5. **Database** > **Connect** > **Drivers** e copie a string `mongodb+srv://...`. Monte a `MONGODB_URI` assim, com o nome do banco antes do `?`:

```
mongodb+srv://destrava:SENHA@cluster0.xxxxx.mongodb.net/destrava?retryWrites=true&w=majority
```

Guarde essa URI. Ela é um segredo.

**Verificação:** a tela do cluster mostra o status ativo, e a URI tem `/destrava?` (nome do banco).

---

## Passo 2: Render (backend)

1. Crie a conta em https://render.com e conecte o GitHub.
2. **New** > **Web Service** > escolha o repositório.
3. Preencha:

| Campo | Valor |
|---|---|
| Name | `destrava-api` (vira parte da URL) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | **Docker** (usa o `backend/Dockerfile`) |
| Instance Type | **Free** |
| Health Check Path | `/health` |

4. Em **Environment Variables**, adicione (substitua o que está entre `<>`):

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | a URI do passo 1 |
| `JWT_SECRET` | segredo gerado (64 hex) |
| `JWT_REFRESH_SECRET` | segredo gerado, diferente do anterior |
| `JWT_EXPIRATION_TIME` | `3600s` |
| `JWT_REFRESH_EXPIRATION_TIME` | `7d` |
| `EMAIL_ENCRYPTION_KEY` | 64 hex gerados |
| `EMAIL_BLIND_INDEX_SECRET` | segredo longo, diferente dos outros |
| `GEMINI_API_KEY` | chave do passo "Antes de começar" |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `ANALYSIS_DAILY_LIMIT` | `3` (por usuário; veja a nota sobre cota abaixo) |
| `FRONTEND_URL` | `https://<seu-projeto>.vercel.app` (preencha no passo 4) |
| `CORS_ORIGINS` | o mesmo valor de `FRONTEND_URL` |
| `COOKIE_SAMESITE` | `lax` |
| `TRUST_PROXY` | número de proxies na frente da API: o limite de requisições passa a usar o IP real do cliente. Na demo (Vercel e Render) o valor é `1`, conferido em 2026-11-08; com um valor maior, o cliente forja o IP. Confira o seu com o teste da seção "Conferir o `TRUST_PROXY`" |
| `METRICS_TOKEN` | um segredo longo (`openssl rand -hex 32`). Sem ele o `/metrics` fica aberto. O Prometheus envia `Authorization: Bearer <token>` |

Não defina `PORT`: o Render injeta a porta e o backend a lê (`PORT`, com 4000 como padrão). Não defina `COOKIE_DOMAIN`: sem ela o cookie fica preso ao domínio da Vercel, que é o que queremos.

As variáveis do Google (`GOOGLE_*`) ficam de fora por enquanto. Sem elas, o login com Google responde 503 e o resto funciona normalmente.

5. **Create Web Service**. O Render reinicia o serviço sozinho sempre que você salva uma variável de ambiente. O primeiro build é lento (compila o `bcrypt`, que é nativo). Acompanhe a aba **Logs**.

6. Quando o status ficar **Live**, copie a URL (`https://SEU-SERVICO.onrender.com`).

**Verificação:**
- Abra `https://SEU-SERVICO.onrender.com/health`. Deve responder 200.
- Nos logs não pode aparecer `FATAL ERROR`. Se aparecer, uma variável está faltando ou inválida (o backend valida no boot: os JWTs com 32 ou mais caracteres, a chave de e-mail com exatamente 64 hex, e `COOKIE_SAMESITE` com um valor aceito).
- A rota do Swagger não deve existir em produção (`NODE_ENV=production` a desliga).

---

## Passo 3: Vercel (frontend)

1. Crie a conta em https://vercel.com (plano Hobby) e conecte o GitHub.
2. **Add New** > **Project** > escolha o repositório.
3. Configure:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Node.js Version | 22.x ou superior (em Settings > General) |

4. **Não** defina `VITE_API_URL`. Deixe vazia, para o frontend chamar `/api/v1` no próprio domínio (`BASE_URL` fica `"" + "/api/v1"`).

5. O arquivo `frontend/vercel.json` já está no repositório, com a regra de repasse e o fallback do SPA. **Troque o host de reserva** (`TROQUE-PELO-HOST-DO-RENDER.invalid`, que de propósito não resolve) pelo host do seu serviço no Render, sem `https://` repetido e sem barra no final. Exemplo do resultado:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://SEU-SERVICO.onrender.com/api/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

A primeira regra manda `/api/*` para o backend. A segunda faz qualquer outra rota cair no `index.html`, necessário para o React Router funcionar ao recarregar uma página como `/resumes`.

6. Faça o commit da troca (PR para `dev`, como de costume). A Vercel só lê o arquivo que está no repositório, na branch de produção (`main` por padrão), e clique em **Deploy**.

7. Copie a URL gerada (`https://<projeto>.vercel.app`).

---

## Passo 4: Ligar as pontas

1. No Render, preencha `FRONTEND_URL` e `CORS_ORIGINS` com a URL da Vercel, **sem barra no final**. O Render reinicia sozinho.
2. Confira que o `destination` do `vercel.json` aponta para a URL real do Render. Se mudar, faça novo deploy.

---

## Passo 5: Verificação ponta a ponta

Abra a URL da Vercel e confira, nesta ordem:

- [ ] A landing carrega, e recarregar uma rota interna não dá 404.
- [ ] Cadastro funciona (a primeira chamada pode demorar até 1 minuto, por causa do servidor dormindo).
- [ ] No DevTools > Application > Cookies, existe `refresh_token` com `HttpOnly` e `Secure`, e `Path=/api/v1/auth`.
- [ ] Recarregar a página mantém a sessão.
- [ ] Logout apaga o cookie.
- [ ] Enviar um PDF de texto e rodar uma análise (gasta 1 das 20 do dia do Gemini).
- [ ] Login com Google responde com mensagem de "não configurado", sem quebrar a tela (esperado até as credenciais do Google serem configuradas).

---

## Conferir o `TRUST_PROXY`

O valor certo depende de quantos proxies ficam entre o visitante e a API, e só um teste diz. No PowerShell, use `curl.exe` (`curl` é apelido de outro comando):

```powershell
curl.exe -s https://api.ipify.org
curl.exe -s -o NUL -H "X-Forwarded-For: 1.2.3.4" https://<seu-projeto>.vercel.app/api/v1/auth/google/redirect
```

O primeiro comando mostra o IP que os servidores veem para a sua máquina. No log do Render, a linha da segunda requisição (`GET /api/v1/auth/google/redirect`) deve ter `clientIp` igual a esse IP:

- `clientIp` igual ao seu IP: o valor está certo.
- `1.2.3.4`: o valor está alto, e qualquer pessoa consegue forjar o IP. Desça em 1.
- IP de nuvem ou desconhecido: o valor está baixo, e todos dividem o mesmo limite. Suba em 1.

Depois de cada mudança no Render, faça **Save, rebuild and deploy** e repita o teste. Só o log de `auth` e `profile` mostra o `clientIp`.

## Deploy automático (CD)

Em `.github/workflows/ci.yml`, cada etapa da CI é uma caixa própria no grafo (`backend / audit`, `lint`, `test`, `build` e `frontend / lint`, `typecheck`, `test`, `build`). Os jobs `deploy / backend (Render)` e `deploy / frontend (Vercel)` rodam em todo push na `main`, **só depois** que todas essas etapas passam, e cada um chama o seu deploy hook. Se um teste falhar, nada é publicado.

Configuração única, feita por você nos painéis:

1. **Render:** serviço > **Settings** > **Deploy Hook**, copie a URL. Em **Build & Deploy**, mude **Auto-Deploy** para **Off**.
2. **Vercel:** projeto > **Settings** > **Git** > **Deploy Hooks**, crie um hook para a branch `main` e copie a URL. Depois desligue o deploy automático da `main` (por exemplo com **Ignored Build Step** em **Settings** > **Git**). Sem isso a Vercel publica antes dos testes.
3. **GitHub:** repositório > **Settings** > **Environments** > crie `production` e, nele, os secrets `RENDER_DEPLOY_HOOK` e `VERCEL_DEPLOY_HOOK`. Marque **Required reviewers** se quiser aprovar cada deploy.

As URLs dos hooks são segredos: quem as tem dispara um deploy. O job falha com mensagem clara se um secret estiver vazio.

**O que isso não cobre:** o job não espera o deploy terminar. Se a nova versão do Render não passar no health check, o Render mantém a antiga no ar, mas o GitHub mostra verde. Acompanhe o primeiro deploy no painel do Render.

## Limitações do plano gratuito (e como lidar)

**Servidor dormindo.** O Render Free dorme após 15 minutos sem requisição e leva cerca de 1 minuto para acordar. A primeira chamada depois disso é lenta. Duas saídas:

1. O frontend já faz isso: abrir `/login` ou `/register` acorda a API em segundo plano (`GET /health`, repassado pelo rewrite `/health` do `vercel.json`), e o botão do Google só navega depois que a API responde com JSON `status: "ok"`, mostrando "Acordando o servidor, pode levar até 1 minuto". Sem isso a navegação cairia na página de espera do Render. Limite: se a API dormir enquanto o usuário está na tela do Google, a volta ainda pode cair nessa página; o `keepalive` abaixo evita.
2. (Opcional) manter o serviço acordado com um agendamento no GitHub Actions. Um serviço ligado o mês todo usa cerca de 720 das 750 horas gratuitas. Isso sai do espírito do plano, use por sua conta:

```yaml
# .github/workflows/keepalive.yml
name: keepalive
on:
  schedule:
    - cron: "*/10 * * * *"
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS https://SEU-SERVICO.onrender.com/health
```

O agendamento do GitHub pode atrasar alguns minutos e é desativado após 60 dias sem atividade no repositório.

**Timeout do rewrite.** A Vercel repassa as chamadas por um proxy com limite de tempo que não consegui confirmar. Uma análise do Gemini leva alguns segundos, mas uma chamada que acorda o servidor leva cerca de 1 minuto. Se uma análise falhar com 504 logo depois de o servidor dormir, é isso: repita a chamada. Se virar problema constante, use o caminho alternativo abaixo.

**Cota do Gemini.** O plano gratuito permite 20 requisições por dia no total, para todos os usuários. `ANALYSIS_DAILY_LIMIT` limita **por usuário**, e ainda não existe um teto global. Até lá, poucos visitantes esgotam a cota do dia. Mantenha `ANALYSIS_DAILY_LIMIT` baixo e considere uma conta de demonstração com análises já geradas.

**Atlas.** O cluster gratuito aceita 100 operações por segundo e 1 cluster por projeto, e pode pausar por inatividade prolongada. Confirme a regra de pausa na documentação do Atlas.

---

## Caminho alternativo: sem rewrite (domínios diferentes)

Se o proxy da Vercel der problema, o frontend pode chamar o Render direto:

1. Na Vercel, defina `VITE_API_URL=https://SEU-SERVICO.onrender.com`, sem barra no final, e refaça o deploy. Remova a regra `/api/` do `vercel.json`, mantendo só o fallback do SPA.
2. No Render, defina `COOKIE_SAMESITE=none`. Isso exige HTTPS e força o `Secure` (ambos já valem aqui).
3. `CORS_ORIGINS` e `FRONTEND_URL` continuam com a URL da Vercel.

Em navegadores que bloqueiam cookies de terceiros, o login pode falhar nesse modo. É por isso que o rewrite é o caminho recomendado.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Log do Render com `FATAL ERROR` no boot | Variável ausente ou inválida | Conferir tamanho dos JWTs (32 ou mais), `EMAIL_ENCRYPTION_KEY` com 64 hex e `COOKIE_SAMESITE` |
| `MongoServerSelectionError` ou timeout | IP não liberado ou senha com caractere especial | Liberar `0.0.0.0/0` no Atlas e usar senha só com letras e números |
| `MongoParseError: Invalid scheme` | `MONGODB_URI` malformada: aspas, espaço, o nome da variável colado junto, ou texto do `mongosh` | Recriar a variável com o valor começando direto em `mongodb+srv://` |
| `tlsv1 alert internal error` (SSL alert 80) e `ReplicaSetNoPrimary` | O Atlas está recusando o IP do Render | Em Network Access, liberar `0.0.0.0/0` e esperar ficar Active |
| Erro de CORS no navegador | `CORS_ORIGINS` diferente da URL da Vercel | Copiar a URL exata, sem barra no final |
| Login funciona mas a sessão some ao recarregar | Cookie não foi criado | Ver `Set-Cookie` na aba Network. Com o rewrite, `COOKIE_SAMESITE=lax` e sem `COOKIE_DOMAIN` |
| 404 ao recarregar `/resumes` | Falta o fallback do SPA | Conferir a segunda regra do `vercel.json` |
| 503 na análise | Cota do Gemini esgotada ou chave inválida | Esperar o dia seguinte ou conferir `GEMINI_API_KEY` |
| Primeira requisição muito lenta | Servidor dormindo | Esperar cerca de 1 minuto ou usar o keepalive |

## Depois do deploy

- Coloque o link da demo na seção Demo do `README.md` e na descrição do repositório.
- Para ativar o login com Google, siga a seção abaixo.

## Login com Google

O fluxo todo passa pelo domínio da Vercel (o botão, o retorno do Google e o cookie), por isso a URI de retorno usa o domínio da Vercel, e não o do Render. A rota de retorno do backend é `/api/v1/auth/google/redirect`.

**Pré-requisito:** o `vercel.json` precisa estar na branch de produção da Vercel (`main`), senão `/api/*` não chega ao backend. Use o domínio **de produção** da Vercel, que é fixo. As URLs de pré-visualização mudam a cada deploy e não servem para o Google.

1. No [Google Cloud Console](https://console.cloud.google.com), crie ou escolha um projeto.
2. **APIs e serviços** > **Tela de permissão OAuth**: tipo Externo, nome do app, e-mail de suporte. Escopos: `openid`, `email` e `profile`. Enquanto o app estiver em modo "Teste", só entram os e-mails listados como usuários de teste. Para qualquer pessoa entrar, publique o app (esses escopos não costumam exigir verificação do Google, confirme no painel).
3. **Credenciais** > **Criar credenciais** > **ID do cliente OAuth** > **Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, cadastre exatamente:

```
https://SEU-PROJETO.vercel.app/api/v1/auth/google/redirect
```

   Para testar no computador, cadastre também `http://localhost:5173/api/v1/auth/google/redirect` (o proxy do Vite repassa `/api` ao backend).
4. Copie o ID do cliente e a chave secreta. Eles são segredos: só no painel do Render, nunca no repositório nem no chat.
5. No Render, em Environment, adicione:

| Variável | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | ID do cliente |
| `GOOGLE_CLIENT_SECRET` | chave secreta |
| `GOOGLE_CALLBACK_URL` | `https://SEU-PROJETO.vercel.app/api/v1/auth/google/redirect`, idêntica à cadastrada no Google |

   `FRONTEND_URL` e `CORS_ORIGINS` já devem ter a URL de produção da Vercel, sem barra no final. É para lá que o backend redireciona depois do login (`/auth/callback`).
6. O Render reinicia sozinho. Depois teste em uma janela anônima: **Entrar com Google** > consentimento > dashboard.

**Verificação**
- [ ] O botão abre a tela de consentimento do Google, sem `redirect_uri_mismatch`.
- [ ] Depois de aceitar, cai em `/auth/callback` e em seguida no dashboard.
- [ ] O cookie `refresh_token` existe com `HttpOnly`, e recarregar mantém a sessão.
- [ ] Negar o consentimento volta ao login com mensagem de erro.

| Sintoma | Causa provável |
|---|---|
| `redirect_uri_mismatch` | A URI cadastrada no Google não é idêntica à `GOOGLE_CALLBACK_URL` (confira `https`, domínio e o final `/redirect`) |
| `Error 403: access_denied` | App em modo Teste e o seu e-mail não está na lista de usuários de teste |
| 503 `Google login is not configured` | Falta uma das três variáveis `GOOGLE_*` no Render |
| Volta ao login com `invalid_state` | O cookie `oauth_state` se perdeu: o início do fluxo e o retorno precisam passar pelo mesmo domínio (Vercel) |
