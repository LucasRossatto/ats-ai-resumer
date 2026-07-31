FROM node:20-alpine

WORKDIR /usr/src/app

# bcrypt é módulo nativo e não tem prebuild para musl, precisa compilar no Alpine
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
  && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 4000

CMD ["node", "dist/main.js"] 