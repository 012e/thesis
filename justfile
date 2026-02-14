set shell := ["bash", "-c"]

# --- Setup ---

# Install all dependencies (Node & .NET)
setup:
    pnpm install
    dotnet tool restore
    dotnet restore

# --- Development ---

# Start backend, frontend, and auth in parallel
dev:
    pnpm nx run-many --target=serve --projects=web,Backend.Api,auth

# Start only the API in watch mode
dev-api:
    dotnet watch --project apps/backend/Backend.Api/Backend.Api.csproj run

# Start only the Auth service
dev-auth:
    pnpm --filter auth serve

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

# --- Database ---

# Apply pending migrations to the database
db-migrate:
    dotnet ef database update --project packages/database/Database.Models/Database.Models.csproj --startup-project apps/backend/Backend.Api/Backend.Api.csproj

# Add a new migration (usage: just db-add-migration MigrationName)
db-add-migration name:
    dotnet ef migrations add {{name}} --project packages/database/Database.Models/Database.Models.csproj --startup-project apps/backend/Backend.Api/Backend.Api.csproj

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

