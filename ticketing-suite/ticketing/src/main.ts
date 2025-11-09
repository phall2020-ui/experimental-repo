import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable CORS for frontend access
  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['*'];
  app.enableCors({ origin: origins, credentials: true });

  // ✅ Listen on Railway's injected port (or 3000 locally)
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`✅ Server listening on http://0.0.0.0:${port}`);
}

bootstrap();
