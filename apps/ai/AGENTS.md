# AI Service Agent Guide

## Purpose

This package is Toin's Mastra-based AI service. It exposes an authenticated,
AI SDK-compatible streaming chat endpoint, delegates work to specialist agents,
and calls the NestJS backend through authenticated MCP servers.

## Architecture

- `src/mastra/index.ts`: Mastra entrypoint, PostgreSQL storage, CORS/auth
  middleware, and `/health` plus `/chat` route registration.
- `src/mastra/routes/stream.ts`: validates the chat request, injects ephemeral UI
  context, builds the request-scoped orchestrator, and returns an AI SDK v6
  `UIMessage` stream.
- `src/mastra/agents/`: orchestrator and domain agents for identity, post
  discovery/creation, interactions, navigation, planning, and web search.
- `src/mastra/mcp/social.ts`: connects to the backend's `identity`, `posts`, and
  `interactions` SSE MCP servers while forwarding the user's bearer token.
- `src/mastra/tools/`: server tools for UI context and client-rendered plan state.
- `src/prompts/index.ts`: centralized behavior and routing instructions.
- `src/mastra/constants.ts`: model and reasoning-effort selection.
- `src/mastra/memory.ts`: shared Mastra PostgreSQL storage/memory configuration.
- `@repo/shared-dto`: owns the runtime schema and TypeScript type for UI context.

The web client posts to `/chat` with a bearer token, messages, optional
`fast`/`thinking` mode, UI context, system instructions, and browser tools.
All routes except `/health` require `Authorization: Bearer <token>`.

## Commands

Run from `thesis/`:

```bash
pnpm --filter @repo/shared-dto build
pnpm --filter ai dev
pnpm --filter ai typecheck
pnpm --filter ai build
pnpm nx run ai:serve
just dev
```

Copy `apps/ai/.env.example` to `.env`. `OPENAI_API_KEY` is required.
`DATABASE_URL`, `BACKEND_URL` (default `http://localhost:3000`), and `PORT`
(default `4111`) are validated in `src/env.ts`. PostgreSQL and the backend must
be available for realistic chat/MCP verification.

## Conventions

- Keep TypeScript strict and ESM; use kebab-case filenames and relative imports
  within this package.
- Define prompts in `src/prompts/index.ts`, model choices in
  `src/mastra/constants.ts`, and environment variables in `src/env.ts`; update
  `.env.example` when adding required configuration.
- Export reusable agent config objects. Static agents registered in
  `src/mastra/index.ts` exist mainly for Mastra Studio; live MCP-enabled agents
  must be constructed in `createOrchestratorAgent` so tools receive the current
  request's authorization.
- Give each specialist only its domain's MCP toolset. Keep the orchestrator on
  delegation/client tools rather than attaching backend social tools directly.
- Validate request/tool inputs with Zod. If UI context changes, update
  `@repo/shared-dto`, rebuild it, and keep the web serializer and AI schema in
  sync.
- Preserve the AI SDK v6 stream format expected by the web
  `AssistantChatTransport`.

## Verification

There is currently no AI-specific test suite. At minimum run:

```bash
pnpm --filter @repo/shared-dto build
pnpm --filter ai typecheck
pnpm --filter ai build
```

For integration changes, start backend, PostgreSQL, and AI, then verify:

```bash
curl http://localhost:4111/health
curl -i -X POST http://localhost:4111/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <valid-token>' \
  --data '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Who am I?"}]}]}'
```

Also exercise chat from the web app when changing streaming, client tools,
navigation, plans, model mode, or UI context.

## Important Pitfalls

- Do not reuse an MCP client or live orchestrator across requests; that can leak
  authentication between users.
- Client/page-local tools are supplied per request. After navigation, the model
  must wait for the next client step before using newly mounted tools.
- `create_plan` and `update_plan_item` only forward state to the client; prompt
  rules enforce approval and status sequencing.
- `postCreationAgent` is currently commented out of the live orchestrator's
  agent registry. Do not assume post writes are available without checking this.
- PostgreSQL memory is configured, but `/chat` does not currently pass memory
  resource/thread options. The scorer files and `stepJudgeAgent` are also not
  wired into the live route.
- `.mastra/`, generated output, `node_modules/`, and `.env` are local/generated;
  edit source files instead.
- `fetch_url` accepts public HTTP(S) URLs and truncates extracted text to 12,000
  characters; preserve timeout, protocol checks, and source-grounded behavior.
