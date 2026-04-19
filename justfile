set shell := ["bash", "-c"]

BACKEND_URL := "http://localhost:3000"

# --- Setup ---

# Install all dependencies Node
setup:
    pnpm install

# --- Development ---

# Start backend, frontend, and AI service in parallel
dev:
    pnpm nx run-many --target=serve --projects=web,backend,ai,rest-contracts --parallel=10

# Start Storybook for the web app
storybook:
    pnpm nx storybook web

# --- Build & Test ---

# Build the entire monorepo using Nx
build:
    pnpm nx run-many --target=build

# Build all workspace packages, then test the entire monorepo using Nx
test:
    pnpm nx run-many --output-style=static --target=build --projects=shared-dto,rest-contracts,auth-client
    pnpm nx run-many --target=test

migrate-db:
    pnpm --filter backend run db:migrate

seed:
    curl -X POST "{{ BACKEND_URL }}/seed"

build-backend:
    pnpm nx run-many --output-style=static --target=build --projects=shared-dto,rest-contracts

build-auth:
    pnpm nx run-many --output-style=static --target=build --projects=auth-client

# Run backend tests in verbose mode
test-verbose: build-backend
    pnpm --filter backend run test:verbose

# Run backend tests in watch mode
test-watch: build-backend
    pnpm --filter backend test:watch

# Run backend e2e tests
test-e2e: build-backend
    pnpm --filter backend test:e2e

# Run module-specific backend tests
test-auth: build-backend build-auth
    pnpm --filter backend test:auth

test-posts: build-backend
    pnpm --filter backend test:posts

test-comments: build-backend
    pnpm --filter backend test:comments

test-polls: build-backend
    pnpm --filter backend test:polls

test-follows: build-backend
    pnpm --filter backend test:follows

test-reactions: build-backend
    pnpm --filter backend test:reactions

test-users: build-backend
    pnpm --filter backend test:users

test-uploads: build-backend
    pnpm --filter backend test:uploads

test-playground: build-backend
    pnpm --filter backend test:playground

test-app: build-backend
    pnpm --filter backend test:app

test-messages: build-backend
    pnpm --filter backend test:messages

# --- E2E Tests ---

# Run e2e tests for web (requires web server to be running)
e2e: build-backend
    pnpm nx run web-e2e:e2e

# Run e2e tests in headed mode (browser visible)
e2e-headed: build-backend
    pnpm nx run web-e2e:e2e:headed

# Run e2e tests in UI mode (interactive)
e2e-ui: build-backend
    pnpm nx run web-e2e:e2e:ui

# Debug e2e tests
e2e-debug: build-backend
    pnpm nx run web-e2e:e2e:debug

# Generate e2e tests interactively (requires web server to be running)
e2e-codegen: build-backend
    pnpm nx run web-e2e:e2e-codegen

# Show Playwright test report
e2e-report:
    pnpm nx run web-e2e:show-report

# Install Playwright browsers
e2e-install:
    pnpm nx run web-e2e:install-browsers

# --- Docker ---

# Start Docker containers (detached)
up:
    docker compose up -d

# Stop and remove Docker containers
down:
    docker compose down

# --- Nx Helper ---

# Visualize dependency graph
graph:
    pnpm nx graph

# --- Project-specific helpers ---

# Run a command in the backend service directory
backend +COMMAND:
    (cd apps/backend && {{ COMMAND }})

# Run a command in the web app directory
web +COMMAND:
    (cd apps/web && {{ COMMAND }})

# Run a command in the AI service directory
ai +COMMAND:
    (cd apps/ai && {{ COMMAND }})

# Run a command in the rest-contracts package directory
rest-contracts +COMMAND:
    (cd packages/rest-contracts && {{ COMMAND }})
