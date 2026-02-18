# Clean Architecture Diagram

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Backend.Api                              │
│                    (Presentation Layer)                          │
│                                                                   │
│  ┌──────────────────┐                                           │
│  │   Program.cs     │  - Configuration & DI                     │
│  └──────────────────┘                                           │
│  ┌──────────────────┐                                           │
│  │   Endpoints/     │  - PostEndpoints.cs (Minimal APIs)        │
│  └──────────────────┘                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ depends on
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend.Application                           │
│                   (Application Layer)                            │
│                                                                   │
│  ┌──────────────────┐                                           │
│  │   Services/      │  - IPostService (interface)               │
│  │                  │  - PostService (implementation)           │
│  └──────────────────┘                                           │
│  ┌──────────────────┐                                           │
│  │   DTOs/          │  - CreatePostRequest                      │
│  │                  │  - UpdatePostRequest                      │
│  │                  │  - PostResponse                           │
│  └──────────────────┘                                           │
└───────────┬─────────────────────────┬───────────────────────────┘
            │ depends on              │ depends on
            ↓                         ↓
┌───────────────────────┐   ┌───────────────────────────────────┐
│  Backend.Domain       │   │  Backend.Infrastructure           │
│  (Domain Layer)       │   │  (Infrastructure Layer)           │
│                       │   │                                   │
│  ┌─────────────────┐ │   │  ┌─────────────────────────────┐ │
│  │   Entities/     │ │   │  │   Data/                     │ │
│  │   - Post.cs     │ │   │  │   - ApplicationDbContext    │ │
│  └─────────────────┘ │   │  └─────────────────────────────┘ │
│                       │   │  ┌─────────────────────────────┐ │
│                       │   │  │   Migrations/               │ │
│                       │   │  │   - EF Core Migrations      │ │
│                       │   │  └─────────────────────────────┘ │
└───────────────────────┘   └───────────────────────────────────┘
                                            │
                                            │ connects to
                                            ↓
                            ┌───────────────────────────┐
                            │   PostgreSQL Database     │
                            │                           │
                            │   - Posts Table (JSONB)   │
                            └───────────────────────────┘
```

## Layer Responsibilities

### 1. Backend.Domain (Core Layer)
- **Purpose**: Contains enterprise business rules and entities
- **Dependencies**: None (innermost layer)
- **Contents**:
  - Entity classes (Post)
  - Domain value objects
  - Domain events (future)
  - Domain exceptions (future)

### 2. Backend.Infrastructure (Data Layer)
- **Purpose**: Implements data access and external services
- **Dependencies**: Backend.Domain
- **Contents**:
  - DbContext (ApplicationDbContext)
  - EF Core Migrations
  - Database configurations
  - External service implementations (future)

### 3. Backend.Application (Use Cases Layer)
- **Purpose**: Contains application business rules
- **Dependencies**: Backend.Domain, Backend.Infrastructure
- **Contents**:
  - Service interfaces (IPostService)
  - Service implementations (PostService)
  - DTOs (Data Transfer Objects)
  - Application logic
  - Validation (future)
  - Mapping logic

### 4. Backend.Api (Presentation Layer)
- **Purpose**: Entry point and API endpoints
- **Dependencies**: Backend.Application (and transitively others)
- **Contents**:
  - Minimal API endpoints
  - Program.cs (startup configuration)
  - Middleware configuration
  - Dependency injection setup
  - API contracts

## Data Flow

### Request Flow (Create Post)
```
1. HTTP POST /api/posts
   │
   ↓
2. PostEndpoints.cs (Minimal API)
   │ - Receives CreatePostRequest DTO
   │
   ↓
3. IPostService.CreateAsync()
   │ - PostService validates and processes
   │
   ↓
4. ApplicationDbContext
   │ - EF Core creates Post entity
   │
   ↓
5. PostgreSQL Database
   │ - Saves record with JSONB content
   │
   ↓
6. PostResponse DTO
   │ - Returns to client
   │
   ↓
7. HTTP 201 Created
```

### Query Flow (Get All Posts)
```
1. HTTP GET /api/posts
   │
   ↓
2. PostEndpoints.cs
   │
   ↓
3. IPostService.GetAllAsync()
   │ - PostService queries database
   │
   ↓
4. ApplicationDbContext
   │ - EF Core executes query
   │
   ↓
5. PostgreSQL Database
   │ - Returns records
   │
   ↓
6. List<PostResponse>
   │ - Maps entities to DTOs
   │
   ↓
7. HTTP 200 OK
```

## Key Design Patterns

### 1. Dependency Inversion Principle (DIP)
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Example: `IPostService` interface

### 2. Repository Pattern (Implicit)
- DbContext acts as a repository
- No explicit repository layer (following Clean Architecture with EF Core best practices)

### 3. Service Layer Pattern
- Business logic encapsulated in services
- Services orchestrate operations

### 4. DTO Pattern
- Separate models for API communication
- Decouples domain entities from API contracts

## Benefits of This Architecture

1. **Testability**: Each layer can be unit tested independently
2. **Maintainability**: Clear separation of concerns
3. **Flexibility**: Easy to swap implementations
4. **Scalability**: Well-organized for growth
5. **Independence**: Business logic isolated from frameworks

## Future Extensions

### Planned Features
- [ ] CQRS pattern (separate read/write models)
- [ ] MediatR for request handling
- [ ] FluentValidation for DTO validation
- [ ] AutoMapper for entity-DTO mapping
- [ ] Repository pattern (if needed)
- [ ] Unit of Work pattern (if needed)
- [ ] Domain events
- [ ] Result pattern for error handling
- [ ] Specification pattern for queries

