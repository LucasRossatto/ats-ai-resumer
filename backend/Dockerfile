# Estagio build: instala tudo, compila e depois remove devDependencies.
# bcrypt e nativo e nao tem prebuild para musl, entao as ferramentas de
# compilacao ficam so aqui. O node_modules de producao (ja com o binario do
# bcrypt) e copiado para o runtime, que usa a mesma base alpine.
FROM node:25-alpine AS build
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM build AS prod-deps
RUN pnpm prune --prod

FROM node:25-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1
CMD ["node", "dist/main.js"]
