import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { AuthController } from './auth/auth.controller';
||||||| 9eacfe5
=======
import { auth } from '@/auth';
import { AuthModule } from '@thallesp/nestjs-better-auth';
>>>>>>> authv2

@Module({
<<<<<<< HEAD
  imports: [],
  controllers: [AppController, AuthController],
||||||| 9eacfe5
  imports: [],
  controllers: [AppController],
=======
  imports: [AuthModule.forRoot({ auth, disableTrustedOriginsCors: true })],
  controllers: [AppController],
>>>>>>> authv2
  providers: [AppService],
})
export class AppModule {}
