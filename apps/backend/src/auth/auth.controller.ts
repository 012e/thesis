import { Controller } from "@nestjs/common";
import { AllowAnonymous, Session } from "@thallesp/nestjs-better-auth";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { authContract } from "@repo/rest-contracts";

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
  me(@Session() session: UserSession) {
    return tsRestHandler(authContract.me, async () => {
      const user = session.user as typeof session.user & { username: string };
      return {
        status: 200,
        body: {
          id: user.id,
          username: user.username,
        },
      };
    });
  }
}
