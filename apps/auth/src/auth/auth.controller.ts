import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { authContract } from '@repo/auth-contracts';

@Controller()
export class AuthController {
  constructor() {}

  @TsRestHandler(authContract.login)
  async login() {
    return tsRestHandler(authContract.login, async ({ body }) => {
      // demo only: accept username 'user' and password 'pass'
      if (body.username === 'user' && body.password === 'pass') {
        return { status: 200, body: { token: 'fake-token' } };
      }

      return { status: 401, body: null };
    });
  }

  @TsRestHandler(authContract.me)
  async me() {
    return tsRestHandler(authContract.me, async ({ headers }) => {
      const auth = headers['authorization'] || headers['Authorization'];
      if (auth === 'Bearer fake-token') {
        return { status: 200, body: { id: '1', username: 'user' } };
      }

      return { status: 401, body: null };
    });
  }
}
