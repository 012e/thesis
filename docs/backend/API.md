# Backend API Reference

All endpoints are defined in `packages/auth-contracts/src/index.ts` (ts-rest contract) and implemented in `apps/backend/src/`.

## Authentication

Authentication is provided by **Better Auth** at `/api/auth/*`. All application routes (posts, reactions) require a valid session unless marked otherwise.

### Better Auth endpoints (managed by Better Auth middleware)

| Method | Path                      | Description                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/api/auth/sign-up/email` | Register a new user with email, password, and optional username/name.     |
| `POST` | `/api/auth/sign-in/email` | Sign in with email and password. Sets a session cookie.                   |
| `POST` | `/api/auth/sign-out`      | Invalidate the current session.                                           |
| `GET`  | `/api/auth/session`       | Return the current session and user.                                      |
| `GET`  | `/api/auth/token`         | Return a short-lived JWT for the current session (requires `jwt` plugin). |

These routes are handled entirely by Better Auth and are not part of the ts-rest contract.

### Contract stubs (ts-rest, placeholder only)

| Method | Path          | Auth                     | Description                                                                                             |
| ------ | ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `POST` | `/auth/login` | None (`@AllowAnonymous`) | Always returns `401`. Exists to satisfy the contract type. Real login uses `/api/auth/sign-in/email`.   |
| `GET`  | `/auth/me`    | Session                  | Always returns `401`. Exists to satisfy the contract type. Real session info is at `/api/auth/session`. |

---

## Posts

All post endpoints require an authenticated session.

### `GET /posts`

List all posts ordered by creation date (newest first). No authentication required by the ts-rest guard but a session cookie must be present.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "authorId": "string",
    "author": {
      "id": "string",
      "username": "string | null",
      "email": "string",
      "name": "string | null"
    },
    "content": {
      /* PostContent */
    },
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
]
```

---

### `POST /posts`

Create a new post. The authenticated user becomes the author.

**Request body**

```json
{
  "content": {
    /* PostContent – see below */
  }
}
```

**Response `201`** – the created post (same shape as above).

---

### `GET /posts/:id`

Fetch a single post by UUID.

**Response `200`** – the post object.  
**Response `404`** – `null` (post not found).

---

### `PUT /posts/:id`

Update the content of a post. Only the original author may update.

**Request body**

```json
{
  "content": {
    /* PostContent */
  }
}
```

**Response `200`** – the updated post.  
**Response `403`** – `null` (requester is not the author).  
**Response `404`** – `null` (post not found).

---

### `DELETE /posts/:id`

Delete a post. Only the original author may delete.

**Response `200`** – the deleted post (snapshot before deletion).  
**Response `403`** – `null` (requester is not the author).  
**Response `404`** – `null` (post not found).

---

## Post content shape

A post's `content` field is a JSONB document validated by `postContentSchema` (`src/posts/posts.schemas.ts`). At least one of `text`, `poll`, or `visualization` must be present.

```typescript
{
  text?: string;           // Free-form text (min 1 char)
  poll?: {
    question: string;
    options: Array<{ id: string; label: string }>;  // min 2 options
    allowsMultipleSelections: boolean;
    closesAt?: string | null;  // ISO 8601 datetime
  };
  visualization?: {
    title: string;
    visualizationType: "bar" | "line" | "pie" | "table";
    data: Array<{ label: string; value: number }>;  // min 1 point
    description?: string;
    unit?: string;
  };
}
```

---

## Reactions

All reaction endpoints require an authenticated session.

### `PUT /posts/:id/reaction`

Add or replace the current user's reaction on a post.

**Request body**

```json
{ "type": "upvote" | "downvote" }
```

If the user already has a reaction of a different type it is replaced (upsert).

**Response `200`**

```json
{
  "postId": "uuid",
  "userId": "string",
  "type": "upvote" | "downvote",
  "createdAt": "ISO 8601"
}
```

**Response `404`** – `null` (post not found).

---

### `DELETE /posts/:id/reaction`

Remove the current user's reaction from a post.

**Response `200`** – the deleted reaction.  
**Response `404`** – `null` (post not found or no reaction existed).

---

### `GET /posts/:id/reaction`

Get reaction counts and the current user's own reaction for a post.

**Response `200`**

```json
{
  "upvotes": 5,
  "downvotes": 1,
  "userReaction": "upvote" | "downvote" | null
}
```

**Response `404`** – `null` (post not found).

---

### `GET /posts/:id/reactors`

List users who reacted to a post, optionally filtered by reaction type.

**Query parameters**

| Parameter | Type                     | Description                        |
| --------- | ------------------------ | ---------------------------------- |
| `type`    | `"upvote" \| "downvote"` | Optional. Filter by reaction type. |

**Response `200`**

```json
[
  {
    "id": "string",
    "username": "string | null",
    "email": "string",
    "name": "string | null",
    "reactionType": "upvote" | "downvote",
    "reactedAt": "ISO 8601"
  }
]
```

**Response `404`** – `null` (post not found).

---

## Common HTTP status codes

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| `200`  | Success                                                   |
| `201`  | Resource created                                          |
| `401`  | Not authenticated (no valid session)                      |
| `403`  | Authenticated but not authorised (not the resource owner) |
| `404`  | Resource not found                                        |
