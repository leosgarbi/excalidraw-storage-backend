# syntax=docker/dockerfile:1.7

# ---------- builder ----------
# Build com TODAS as dependências (inclusive devDependencies) para o nest build.
FROM node:20-alpine AS builder
WORKDIR /app

# Toolchain nativa para módulos como sqlite3 + openssl pro Prisma engine.
RUN apk add --no-cache python3 make g++ libc6-compat openssl

# `package-lock.json*` (glob) torna o lock opcional. Se estiver fora de
# sincronia com package.json, npm ci falha → cai pra npm install (regenera
# o lock dentro do container; build não-reproduzível mas funciona).
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund \
 || (echo ">>> npm ci falhou (lock dessincronizado). Caindo pra npm install." \
     && npm install --no-audit --no-fund)

COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Gera o Prisma Client antes do nest build (tipos Role/InviteStatus etc.).
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

RUN apk add --no-cache tini libstdc++ openssl

# node_modules completos do builder (já com Prisma Client gerado e CLI presente p/ migrate deploy em runtime).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Entrypoint roda `prisma migrate deploy` antes de iniciar a app.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
