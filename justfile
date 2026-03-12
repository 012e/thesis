set shell := ["bash", "-c"]

# --- Setup ---

# Install all dependencies (Node & .NET)
setup:
    pnpm install
    dotnet tool restore
    dotnet restore

# --- Development ---

# Start backend and frontend in parallel (Nx automatically builds auth-contracts first)
dev:
    pnpm nx run-many --target=serve --projects=web,backend

# Start all services including auth-contracts in watch mode
dev-watch:
    pnpm concurrently "pnpm --filter @repo/auth-contracts dev" "pnpm nx run-many --target=serve --projects=web,backend"

# Start only the backend service
dev-api:
    pnpm --filter backend serve

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

# Test the entire monorepo using Nx
test:
    pnpm nx run-many --target=test

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

# Run a command in the auth-contracts package directory
auth-contracts +COMMAND:
    (cd packages/auth-contracts && {{ COMMAND }})

# Build the auth-contracts package
build-auth-contracts:
    pnpm --filter @repo/auth-contracts build

# Typecheck the auth-contracts package
typecheck-auth-contracts:
    pnpm --filter @repo/auth-contracts typecheck
