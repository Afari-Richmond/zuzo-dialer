import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const tenantWebCandidates = [join(__dirname, '..', 'tenant-web', 'dist')];
  const tenantWebRoot = tenantWebCandidates.find((dir) =>
    existsSync(join(dir, 'index.html')),
  );
  if (tenantWebRoot) {
    app.useStaticAssets(tenantWebRoot, { prefix: '/app/' });
    logger.log(`Tenant web UI at /app/ (${tenantWebRoot})`);
  }

  const platformWebCandidates = [join(__dirname, '..', 'platform-web', 'dist')];
  const platformWebRoot = platformWebCandidates.find((dir) =>
    existsSync(join(dir, 'index.html')),
  );
  if (platformWebRoot) {
    app.useStaticAssets(platformWebRoot, { prefix: '/super-admin/' });
    logger.log(`Platform (super-admin) web UI at /super-admin/ (${platformWebRoot})`);
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
