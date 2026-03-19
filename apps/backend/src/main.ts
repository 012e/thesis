import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from '@/env';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Required for Better Auth
  });
  app.enableCors({
    credentials: true,
    origin: env.ALLOWED_ORIGINS,
  });
  // Enable graceful shutdown hooks for Terminus
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
void bootstrap();
