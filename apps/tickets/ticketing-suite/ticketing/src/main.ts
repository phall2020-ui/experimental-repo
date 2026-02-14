import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  try {
    // Early visibility
    console.log('🚀 Bootstrapping… PORT=', process.env.PORT, 'API_PREFIX=', process.env.API_PREFIX);

    const app = await NestFactory.create(AppModule);
    console.log('✨ NestFactory.create(AppModule) complete');

    // Security headers
    app.use(helmet());

    // CORS
    const origins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : ['*'];
    app.enableCors({ origin: origins, credentials: true });
    console.log('🔓 CORS origins:', origins);

    // Optional global prefix (e.g. "api")
    const prefix = process.env.API_PREFIX?.trim();
    if (prefix) {
      app.setGlobalPrefix(prefix);
      console.log('🧭 Global prefix set:', `/${prefix}`);
    }

    // Bind to Railway port
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`✅ Listening on http://0.0.0.0:${port}`);
    console.log(`🩺 Health endpoint: /${prefix ? prefix + '/' : ''}health`);
  } catch (err) {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));

bootstrap();
