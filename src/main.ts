import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import 'reflect-metadata';
import { AppModule } from './app.module';

const STORAGE_BINARY_PATTERNS: { method: string; re: RegExp }[] = [
  { method: 'POST', re: /^\/api\/drawings\/[^/]+\/scenes\/?$/ },
  { method: 'PUT', re: /^\/api\/drawings\/[^/]+\/rooms\/[^/]+\/?$/ },
  { method: 'PUT', re: /^\/api\/drawings\/[^/]+\/files\/[^/]+\/?$/ },
];

function isStorageBinary(req: express.Request): boolean {
  const path = req.url.split('?')[0];
  return STORAGE_BINARY_PATTERNS.some((p) => p.method === req.method && p.re.test(path));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: ['log', 'error', 'warn'],
  });

  app.use(cookieParser());

  const rawParser = express.raw({ type: '*/*', limit: process.env.BODY_LIMIT ?? '50mb' });
  const jsonParser = express.json({ limit: '5mb' });
  app.use(
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (isStorageBinary(req)) return rawParser(req, res, next);
      return jsonParser(req, res, next);
    },
  );

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix(process.env.GLOBAL_PREFIX ?? 'api');

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend ouvindo em http://localhost:${port}`);
}
void bootstrap();
