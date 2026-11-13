import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

// SPA static serving: files under /prefix/ come straight off disk; any other
// GET under /prefix/ (a client-side route like /app/campaigns/:id) falls
// back to index.html so the React router can take over.
function serveSpa(app: NestExpressApplication, root: string, prefix: string, logger: Logger) {
  app.useStaticAssets(root, { prefix, index: false, redirect: false });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(prefix, (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path !== '/' && /\.[a-z0-9]+$/i.test(req.path)) return next();
    res.sendFile(join(root, 'index.html'), (err?: Error) => {
      if (err) next(err);
    });
  });
  logger.log(`Serving ${prefix} (${root})`);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // rawBody: true preserves the exact request bytes on req.rawBody alongside
  // Nest's normal parsed req.body — needed to verify Twilio/Africa's Talking
  // webhook signatures, which are computed over the raw payload.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  // Explicit origin allowlist (not the default wide-open enableCors()) —
  // required once cookies are sent cross-site (SameSite=None): browsers
  // reject a credentialed request against Access-Control-Allow-Origin: *.
  // ALLOWED_ORIGINS is a comma-separated list; same-origin deploys (no
  // separate frontend origin) can leave it unset entirely.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const tenantWebRoot = join(__dirname, '..', '..', 'tenant-web', 'dist');
  if (existsSync(join(tenantWebRoot, 'index.html'))) {
    serveSpa(app, tenantWebRoot, '/outreach/', logger);
  } else {
    logger.warn(`tenant-web/dist not found at ${tenantWebRoot} — run \`npm run build -w apps/tenant-web\``);
  }

  const platformWebRoot = join(__dirname, '..', '..', 'platform-web', 'dist');
  if (existsSync(join(platformWebRoot, 'index.html'))) {
    serveSpa(app, platformWebRoot, '/super-admin/', logger);
  } else {
    logger.warn(`platform-web/dist not found at ${platformWebRoot} — run \`npm run build -w apps/platform-web\``);
  }

  const config = new DocumentBuilder()
    .setTitle('zuzo-dialer API')
    .setDescription('Multitenant campaign-calling platform API')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3100;
  await app.listen(port);
  logger.log(`zuzo-dialer API listening on http://localhost:${port}/api/v1`);
  logger.log(`Health check (no prefix) at http://localhost:${port}/health`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
