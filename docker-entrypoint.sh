#!/bin/sh
set -e

# Aplica migrations pendentes no Postgres antes de subir a app.
# `migrate deploy` é seguro em produção: só aplica migrations já versionadas,
# nunca cria/altera schema interativamente.
echo ">>> Rodando prisma migrate deploy..."
npx prisma migrate deploy

echo ">>> Iniciando NestJS..."
exec node dist/main.js
