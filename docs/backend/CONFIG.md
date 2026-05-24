# Backend Configuration

Environment variables are validated at startup using `@t3-oss/env-core` with Zod schemas (`src/env.ts`). The application will refuse to start if a required variable is missing or fails validation.

Copy `.env.example` to `.env` before starting:

```sh
cp apps/backend/.env.example apps/backend/.env
```

## Variables

| Variable             | Required | Default                                                  | Description                                                                                                                                               |
| -------------------- | -------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Yes      | `postgresql://username:password@localhost:5432/database` | PostgreSQL connection string.                                                                                                                             |
| `BETTER_AUTH_SECRET` | Yes      | `changeme_random_string_1234567890`                      | Secret used to sign Better Auth sessions and JWTs. **Must be at least 32 characters in production. Change this value.**                                   |
| `BETTER_AUTH_URL`    | Yes      | `http://localhost:3000`                                  | Public base URL of this backend, used by Better Auth for cookie domain and redirect targets. Must match the origin from which `/api/auth/*` is reachable. |
| `PORT`               | No       | `3000`                                                   | TCP port the NestJS HTTP server listens on.                                                                                                               |
| `NODE_ENV`           | No       | `development`                                            | Runtime environment: `development`, `production`, or `test`.                                                                                              |
| `ALLOWED_ORIGINS`    | No       | `http://localhost:5173`                                  | CORS allowed origins for the NestJS layer. Accepts a single URL string or a JSON array of URL strings. Set to the frontend origin(s).                     |

> `RABBITMQ_URL` appears in `apps/backend/.env.example` and `docker-compose.yaml`, but the running application does not read or use RabbitMQ configuration: there is no RabbitMQ client code (no use of `amqplib`/Nest microservices RMQ client) in `apps/backend/src/` and `src/env.ts` does not declare `RABBITMQ_URL`.
>
> In short: RabbitMQ is present in auxiliary files (compose + example env) but it is not installed or used by the backend code. You can either remove the `rabbitmq` service from `docker-compose.yaml` and `RABBITMQ_URL` from `.env.example`, or keep them as an optional integration stub. The docs intentionally do not require RabbitMQ for normal local development.

## Validation rules

- `DATABASE_URL` – must be a valid URL.
- `BETTER_AUTH_SECRET` – minimum 32 characters.
- `BETTER_AUTH_URL` – must be a valid URL.
- `PORT` – coerced to a number.
- `NODE_ENV` – must be one of `development`, `production`, `test`.
- `ALLOWED_ORIGINS` – a valid URL string or an array of valid URL strings.
- Empty strings are treated as `undefined` (`emptyStringAsUndefined: true`), so the defaults apply when variables are set but empty.

## Better Auth migration helper

The backend package exposes a convenience script to regenerate Better Auth types used by the application tests and runtime helpers:

```sh
pnpm --filter backend run auth:migrate
```

This runs the Better Auth CLI to generate `src/db/auth-schema.ts`. Run this after upgrading Better Auth or changing auth plugins.

## Production checklist

- Set `BETTER_AUTH_SECRET` to a cryptographically random string of ≥ 32 chars (e.g. `openssl rand -hex 32`).
- Set `BETTER_AUTH_URL` to the public HTTPS URL of the backend.
- Set `ALLOWED_ORIGINS` to the production frontend URL(s).
- Set `NODE_ENV=production`.
- Ensure `DATABASE_URL` uses a TLS connection string in production.
