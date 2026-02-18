#!/bin/bash

# Backend Development Helper Script

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$BACKEND_DIR/Backend.Api"
INFRA_DIR="$BACKEND_DIR/Backend.Infrastructure"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Backend Development Helper${NC}"
echo "================================"

case "$1" in
  build)
    echo -e "${GREEN}Building projects...${NC}"
    cd "$BACKEND_DIR"
    dotnet build
    ;;

  restore)
    echo -e "${GREEN}Restoring packages...${NC}"
    cd "$BACKEND_DIR"
    dotnet restore
    ;;

  run)
    echo -e "${GREEN}Running API...${NC}"
    cd "$API_DIR"
    dotnet run
    ;;

  migrate)
    if [ -z "$2" ]; then
      echo "Usage: ./dev.sh migrate <MigrationName>"
      exit 1
    fi
    echo -e "${GREEN}Creating migration: $2${NC}"
    cd "$API_DIR"
    dotnet ef migrations add "$2" --project "$INFRA_DIR/Backend.Infrastructure.csproj"
    ;;

  update-db)
    echo -e "${GREEN}Updating database...${NC}"
    cd "$API_DIR"
    dotnet ef database update
    ;;

  drop-db)
    echo -e "${GREEN}Dropping database...${NC}"
    cd "$API_DIR"
    dotnet ef database drop --force
    ;;

  reset-db)
    echo -e "${GREEN}Resetting database (drop + update)...${NC}"
    cd "$API_DIR"
    dotnet ef database drop --force
    dotnet ef database update
    ;;

  clean)
    echo -e "${GREEN}Cleaning build artifacts...${NC}"
    cd "$BACKEND_DIR"
    dotnet clean
    find . -name "bin" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "obj" -type d -exec rm -rf {} + 2>/dev/null || true
    ;;

  *)
    echo "Usage: ./dev.sh {build|restore|run|migrate|update-db|drop-db|reset-db|clean}"
    echo ""
    echo "Commands:"
    echo "  build      - Build all projects"
    echo "  restore    - Restore NuGet packages"
    echo "  run        - Run the API"
    echo "  migrate    - Create a new migration"
    echo "  update-db  - Apply migrations to database"
    echo "  drop-db    - Drop the database"
    echo "  reset-db   - Drop and recreate database"
    echo "  clean      - Clean build artifacts"
    exit 1
    ;;
esac

echo -e "${GREEN}Done!${NC}"

