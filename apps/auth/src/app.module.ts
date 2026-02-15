import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { auth } from '@/auth';
import { AuthModule } from '@thallesp/nestjs-better-auth';

@Module({
  controllers: [AppController, AuthController],
  imports: [AuthModule.forRoot({ auth, disableTrustedOriginsCors: true })],
  providers: [AppService],
})
export class AppModule {}
