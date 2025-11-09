import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Add security headers
  app.use(helmet());

  // ✅ Enable CORS for frontend access
  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['*'];
  app.enableCors({ origin: origins, credentials: true });

  // ✅ Optional global prefix (e.g., 'api' for /api/*)
  const prefix = process.env.API_PREFIX?.trim();
  if (prefix) {
    app.setGlobalPrefix(prefix);
  }

  // ✅ Listen on Railway's injected port (or 3000 locally)
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`✅ Server listening on http://0.0.0.0:${port}${prefix ? ` (prefix: /${prefix})` : ''}`);
  console.log(`CORS origins: ${origins.join(', ')}`);
  console.log(`Health endpoint: /${prefix ? prefix + '/' : ''}health`);
}

bootstrap();
