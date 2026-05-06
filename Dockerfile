# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Toolchain p/ deps nativas (bcryptjs é puro JS, mas mantemos por segurança).
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# Schema antes do generate p/ aproveitar cache de layer.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build


# ---------- runner ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# OpenSSL é necessário para os engines do Prisma; tini cuida do PID 1.
RUN apk add --no-cache openssl tini

# node_modules completos (mantém prisma CLI p/ migrate deploy em runtime).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

USER node

ENTRYPOINT ["/sbin/tini", "--"]
# Aplica migrations e sobe o servidor.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]

