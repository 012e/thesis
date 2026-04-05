import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { expect } from 'vitest';

export async function createE2ETestUser(
  app: INestApplication,
  email: string,
  username: string,
) {
  const request = supertest.default || supertest;

  const registerRes = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .send({
      email,
      username,
      password: 'TestPassword123!',
      name: 'Test User',
    });

  if (registerRes.status !== 200) {
    console.error(
      'Registration failed:',
      registerRes.status,
      registerRes.body,
      registerRes.text,
    );
  }

  expect(registerRes.status).toBe(200);

  const headers = registerRes.headers;

  const setCookieHeader = headers['set-cookie'];

  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const cookie = cookies
    .find((c: any) => c.startsWith('better-auth.session_token='))
    ?.split(';')[0];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user = registerRes.body.user;

  return { user, cookie };
}
