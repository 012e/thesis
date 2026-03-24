set shell := ["bash", "-c"]

# --- Setup ---

# Install all dependencies (Node & .NET)
setup:
    pnpm install
    dotnet tool restore
    dotnet restore

# --- Development ---

# Start backend, frontend, and AI service in parallel
dev:
    pnpm nx run-many --target=serve --projects=web,backend,ai

# Start all services including auth-contracts in watch mode
dev-watch:
    pnpm concurrently "pnpm --filter @repo/auth-contracts dev" "pnpm nx run-many --target=serve --projects=web,backend,ai"

# Start only the backend service
dev-backend:
    pnpm --filter backend serve

# Start only the Web App
dev-web:
    pnpm --filter web dev

# --- Build & Test ---

# Build the entire monorepo using Nx
build:
    pnpm nx run-many --target=build

# Build all workspace packages, then test the entire monorepo using Nx
test:
    pnpm nx run-many --target=build --projects=shared-dto,auth-contracts,auth-client
    pnpm nx run-many --target=test

# Run backend tests in verbose mode
test-verbose:
    pnpm --filter backend run test:verbose

# Run backend tests in watch mode
test-watch:
    pnpm --filter backend test:watch

# Run backend e2e tests
test-e2e:
    pnpm --filter backend test:e2e

# --- E2E Tests ---

# Run e2e tests for web (requires web server to be running)
e2e:
    pnpm nx run web-e2e:e2e

# Run e2e tests in headed mode (browser visible)
e2e-headed:
    pnpm nx run web-e2e:e2e:headed

# Run e2e tests in UI mode (interactive)
e2e-ui:
    pnpm nx run web-e2e:e2e:ui

# Debug e2e tests
e2e-debug:
    pnpm nx run web-e2e:e2e:debug

# Generate e2e tests interactively (requires web server to be running)
e2e-codegen:
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

# Run a command in the auth-contracts package directory
auth-contracts +COMMAND:
    (cd packages/auth-contracts && {{ COMMAND }})
