import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from '@/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });
  app.enableCors({
    credentials: true,
    origin: env.ALLOWED_ORIGINS,
  });
  await app.listen(env.PORT);
}
void bootstrap();
