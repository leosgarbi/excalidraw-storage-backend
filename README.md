# Excalidraw SaaS — Backend (NestJS)

API NestJS com Prisma + Postgres + JWT em cookie httpOnly.
Empacotada como uma única imagem Docker para deploy no Dokploy.

## Endpoints (prefixo global `/api`)

- `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`
- `GET|POST /drawings` — lista (owned/shared) · cria
- `GET|PUT|PATCH|DELETE /drawings/:id` — ler/atualizar conteúdo/renomear/apagar
- `GET /drawings/:id/members` · `PATCH|DELETE /drawings/:id/members/:memberId`
- `GET|POST /drawings/:id/invites` · `DELETE /drawings/:id/invites/:inviteId`
- `GET /invites/:token` (público) · `POST /invites/:token/accept`
- `POST /drawings/:id/scenes` · `GET /drawings/:id/scenes/:sceneId`
- `GET|PUT /drawings/:id/rooms/:roomId`
- `GET|PUT /drawings/:id/files/:fileId`

## Variáveis de ambiente

| Nome             | Obrigatório | Descrição                                                  |
| ---------------- | :---------: | ---------------------------------------------------------- |
| `DATABASE_URL`   | sim         | Postgres connection string.                                |
| `JWT_SECRET`     | sim         | Segredo p/ assinar JWT (ex.: `openssl rand -hex 64`).      |
| `PORT`           | não         | Padrão `8080`.                                             |
| `CORS_ORIGINS`   | não         | CSV com origens permitidas (`https://app.exemplo.com`).    |
| `COOKIE_SECURE`  | não         | `true` em produção (HTTPS).                                |

## Deploy (Dokploy / Docker puro)

```bash
docker build -t excalidraw-backend .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/excalidraw" \
  -e JWT_SECRET="..." \
  -e CORS_ORIGINS="https://app.exemplo.com" \
  -e COOKIE_SECURE=true \
  excalidraw-backend
```

O `CMD` da imagem roda `prisma migrate deploy` antes de subir o servidor,
aplicando migrations pendentes a cada deploy. Aponte `DATABASE_URL` para
um Postgres gerenciado (no Dokploy basta criar um serviço Postgres e
referenciar a URL interna) e exponha a porta `8080`.

## Dev local

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev   # http://localhost:8080/api
```
