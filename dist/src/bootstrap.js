"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfiguredApp = createConfiguredApp;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const logger = new common_1.Logger('Bootstrap');
function shouldEnableSwagger() {
    if (process.env.ENABLE_SWAGGER === 'true')
        return true;
    if (process.env.ENABLE_SWAGGER === 'false')
        return false;
    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const isProduction = process.env.NODE_ENV === 'production';
    return !isLambda && !isProduction;
}
function normalizeOrigin(origin) {
    return origin.trim().replace(/\/+$/, '');
}
function getCorsOrigins() {
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
function isAmplifyBranch(origin) {
    return /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.amplifyapp\.com$/i.test(origin);
}
async function createConfiguredApp(adapter) {
    const app = adapter
        ? await core_1.NestFactory.create(app_module_1.AppModule, adapter)
        : await core_1.NestFactory.create(app_module_1.AppModule);
    const corsOrigins = getCorsOrigins();
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            const normalizedOrigin = normalizeOrigin(origin);
            const ok = corsOrigins.includes(normalizedOrigin) || isAmplifyBranch(normalizedOrigin);
            callback(ok ? null : new Error(`CORS blocked for origin: ${normalizedOrigin}`), ok);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400,
    });
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    logger.log(`CORS enabled for ${corsOrigins.length} explicit origin(s) + Amplify regex`);
    if (shouldEnableSwagger()) {
        try {
            const swaggerConfig = new swagger_1.DocumentBuilder()
                .setTitle('Backend Truck API')
                .setDescription('API de gestao de transporte e logistica')
                .setVersion('1.0.0')
                .addBearerAuth({
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            }, 'access-token')
                .build();
            const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
            swagger_1.SwaggerModule.setup('docs', app, document);
            logger.log('Swagger enabled at /docs');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`Swagger disabled due to runtime error: ${message}`);
        }
    }
    return app;
}
//# sourceMappingURL=bootstrap.js.map