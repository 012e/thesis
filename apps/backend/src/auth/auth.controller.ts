import { Controller } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { authContract } from '@repo/auth-contracts';

@Controller()
export class AuthController {
  @AllowAnonymous()
  @TsRestHandler(authContract.login)
  login() {
    // Better Auth handles authentication via its own middleware routes (/api/auth/*).
    // This endpoint exists to satisfy the ts-rest contract; actual login goes through
    // the Better Auth handler mounted at /api/auth/sign-in/email.
    return tsRestHandler(authContract.login, async () => {
      return { status: 401, body: null };
    });
  }

  @TsRestHandler(authContract.me)
  me() {
    // Placeholder: real session info is accessible via Better Auth's session endpoint.
    return tsRestHandler(authContract.me, async () => {
      return { status: 401, body: null };
    });
  }
}
