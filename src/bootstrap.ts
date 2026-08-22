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
        .setDescription(
          [
            'API de gestão de transporte e logística.',
            '',
            'Todas as rotas, exceto as de autenticação, exigem um token JWT no header ',
            '`Authorization: Bearer <token>`. Use **Autenticação → POST /auth/login** para obter o token ',
            'e o botão **Authorize** acima para aplicá-lo às chamadas desta página.',
            '',
            'Papéis: `ADMIN` tem acesso irrestrito; `DRIVER` enxerga e altera apenas os próprios ',
            'lançamentos, mesmo quando informa o id de outro motorista na requisição.',
          ].join(''),
        )
        .setVersion('1.1.0')
        // A ordem abaixo define a ordem das seções na página do Swagger.
        .addTag('Autenticação', 'Cadastro, login e renovação de token')
        .addTag('Veículos', 'Cadastro da frota: placa, tipo, capacidade e status')
        .addTag('Motoristas', 'Cadastro, aprovação, acesso e CNH dos motoristas')
        .addTag('Fretes', 'Fretes da operação, criados a partir do CT-e ou avulsos')
        .addTag('Abastecimentos', 'Lançamento de abastecimentos, com litros, valor e odômetro')
        .addTag('Gastos de Veículos', 'Pedágio, borracharia, manutenção rápida e outros gastos')
        .addTag('Financeiro', 'Saldo consolidado e sincronização via Open Banking')
        .addTag('Transações', 'Extrato de movimentações da carteira do usuário')
        .addTag('Contas a Pagar', 'Contas a pagar e baixa de pagamento')
        .addTag('Pagamentos de Motorista', 'Cálculo, execução e histórico de pagamentos')
        .addTag('NF-e', 'Consulta e validação de NF-e e NFC-e por chave, QR Code ou código de barras')
        .addTag('CT-e', 'Consulta e validação de CT-e e CT-e OS a partir do DACTE')
        .addTag('Infraestrutura', 'Disponibilidade da API')
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
