# Content Moderation Feature — Implementation Plan

## Overview
Add a comprehensive content moderation system with a pipeline architecture. The system supports admin flagging, duplicate detection (hash + embedding), harmful content detection (OpenAI omni-moderation), LLM validation, and user reports. All uncertain decisions escalate to human review.

---

## Backend Tasks

### 1. Database Schema & Migration
- [x] Create moderation enums: `moderation_status`, `moderation_source`, `flag_priority`, `report_reason`
- [x] Create `post_flags` table (admin flagging with priority levels)
- [x] Create `post_moderation` table (central moderation record per post)
- [x] Create `post_reports` table (user reports)
- [x] Add `content_hash` column to `posts` table for duplication checks
- [x] Create Drizzle migration SQL file + update journal

### 2. Shared Contracts & DTOs
- [x] Add moderation Zod schemas to `packages/rest-contracts/src/schemas/moderation.ts`
- [x] Add moderation contract to `packages/rest-contracts/src/contracts/moderation.ts`
- [x] Export from `packages/rest-contracts/src/index.ts`
- [x] Add moderation DTOs to `packages/shared-dto`

### 3. Moderation Module (Backend Core)
- [x] Create `src/moderation/` module structure
- [x] `moderation.module.ts` — NestJS module
- [x] `moderation.controller.ts` — Admin endpoints (list flags, review, update status)
- [x] `moderation.service.ts` — Core moderation logic

### 4. Moderation Pipeline Services
- [x] `content-hash.service.ts` — SHA-256 hash of normalized content
- [x] `duplicate-detection.service.ts` — Hash check + embedding similarity
- [x] `harmful-content.service.ts` — OpenAI omni-moderation-latest integration
- [x] `llm-validation.service.ts` — Cheap LLM (gpt-4.1-mini) for confidence scoring + summary
- [x] `moderation-pipeline.service.ts` — Orchestrates the full pipeline

### 5. User Reports
- [x] `reports.controller.ts` — User-facing report endpoint
- [x] `reports.service.ts` — Report processing with heuristic gibberish check

### 6. Pipeline Integration
- [x] Hook into `PostsService.create()` to trigger moderation pipeline on new posts
- [x] Auto-hide posts with critical priority flags

### 7. Tests
- [x] Unit tests for content-hash service
- [x] Unit tests for duplicate-detection service (mock embedding service)
- [x] Unit tests for harmful-content service (mock OpenAI)
- [x] Unit tests for LLM validation service (mock OpenAI)
- [x] Unit tests for moderation pipeline orchestration
- [x] Unit tests for report gibberish heuristic
- [x] Unit tests for moderation service (DB operations)
- [x] Integration/E2E tests for moderation controller endpoints
- [x] Integration/E2E tests for report controller endpoints

---

## Frontend Tasks

### 8. API Integration
- [x] Create `src/lib/api/moderation.ts` — API functions for moderation endpoints

### 9. Admin Moderation Dashboard
- [x] Create `src/routes/admin/moderation.tsx` — Main moderation page
- [x] Create `src/components/admin/moderation/` — Moderation components
  - [x] `moderation-table.tsx` — Paginated table with filters
  - [x] `moderation-filters.tsx` — Filter controls (status, source, priority, etc.)
  - [x] `moderation-detail-dialog.tsx` — Detail view for a moderation record
  - [x] `moderation-actions.tsx` — Admin action buttons (approve, reject, escalate)

### 10. User Report Flow
- [x] Create report dialog component for posts
- [x] Integrate report button into post dropdown menu

---

## Pipeline Flow

```
New Post Created
    │
    ├─► Content Hash Check
    │     └─ If hash match → flag as DUPLICATE (high confidence)
    │
    ├─► Embedding Similarity Check
    │     └─ If cosine similarity > threshold → flag as POSSIBLY_DUPLICATED
    │         └─ LLM Validation → confidence 1-100 + summary
    │             └─ If low confidence → NEEDS_HUMAN_REVIEW
    │
    ├─► OpenAI Omni-Moderation
    │     └─ If flagged → LLM Validation
    │         └─ If uncertain → NEEDS_HUMAN_REVIEW
    │
    └─► (Async) User Reports
          └─ Heuristic gibberish check
              └─ LLM Validation
                  └─ If uncertain → NEEDS_HUMAN_REVIEW
```
