# syntax=docker/dockerfile:1.7

# ---------- builder ----------
# Build com TODAS as dependências (inclusive devDependencies) para o nest build.
FROM node:20-alpine AS builder
WORKDIR /app

# Toolchain nativa para módulos como sqlite3.
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build \
 && npm prune --omit=dev

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

RUN apk add --no-cache tini libstdc++

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
