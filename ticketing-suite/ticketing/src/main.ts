import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import './otel';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // ThrottlerGuard is now applied via APP_GUARD provider in module

  const config = new DocumentBuilder()
    .setTitle('Ticketing API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
