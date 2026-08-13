import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from '@app/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const logger = new Logger('Bootstrap');

function shouldEnableSwagger(): boolean {
  if (process.env.ENABLE_SWAGGER === 'true') return true;
  if (process.env.ENABLE_SWAGGER === 'false') return false;

  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const isProduction = process.env.NODE_ENV === 'production';

  return !isLambda && !isProduction;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://main.domernyar0nvy1.amplifyapp.com',
  ];
}

function isAmplifyBranch(origin: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.amplifyapp\.com$/i.test(origin);
}

export async function createConfiguredApp(adapter?: ExpressAdapter) {
  const app = adapter
    ? await NestFactory.create(AppModule, adapter)
    : await NestFactory.create(AppModule);

  const corsOrigins = getCorsOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const ok = corsOrigins.includes(normalizedOrigin) || isAmplifyBranch(normalizedOrigin);

      callback(
        ok ? null : new Error(`CORS blocked for origin: ${normalizedOrigin}`),
        ok,
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  logger.log(`CORS enabled for ${corsOrigins.length} explicit origin(s) + Amplify regex`);

  if (shouldEnableSwagger()) {
    try {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Backend Truck API')
        .setDescription('API de gestao de transporte e logistica')
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          'access-token',
        )
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document);
      logger.log('Swagger enabled at /docs');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Swagger disabled due to runtime error: ${message}`);
    }
  }

  return app;
}
