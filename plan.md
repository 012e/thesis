# Preferred And Blocked Tags Feature Plan

## Goal

Add explicit per-user tag preferences so a user can mark tags as preferred or blocked.

Preferred tags should improve discovery and cold-start personalization. Blocked tags should prevent unwanted topics from appearing in personalized surfaces.

## Existing Architecture Fit

The repo already has the right foundations:

- Tags are normalized in `tags` and joined to posts through `post_tags`.
- Tag browsing exists at `/tags/$slug` with `Top` and `Latest` feeds.
- Home has `For you` recommendations backed by the recommendation queue and `Following` backed by a direct feed query.
- User profile/settings already own account and profile editing.
- Contracts are centralized in `packages/rest-contracts`; backend controllers/services use ts-rest; web uses typed API helpers and TanStack Query.

This feature should extend the existing tags and recommendation modules instead of creating a parallel topic system.

## Recommended Product Model

Use one user-tag preference table with a preference kind:

- `preferred`: user wants more of this tag.
- `blocked`: user does not want posts with this tag in personalized feeds.

Recommended rule: the same tag cannot be both preferred and blocked for one user. Switching from preferred to blocked should replace the previous preference.

Use existing tag records as the source of truth. A user preference should point to `tags.id`, not store raw tag text. If the user types a tag that does not exist yet, the product must choose whether to create a tag immediately or only allow existing tag selection. I recommend initially allowing existing tags only through search/suggestions, because current tags are created from actual post hashtags.

## Backend Integration

Add a small preference service near the existing tag domain.

Recommended placement:

- Add preference APIs under the `tagsContract`, because the resource being managed is tag preferences.
- Keep implementation in `apps/backend/src/tags/`, likely as methods on `TagsService` or a small `UserTagPreferencesService` provided by `TagsModule`.
- Do not put this in Better Auth or `user_profiles`; it is app-level personalization data, not account identity.

Suggested contract shape at high level:

- `GET /users/me/tag-preferences` returns preferred and blocked tag lists.
- `PUT /users/me/tag-preferences/:slug` sets one tag to `preferred` or `blocked`.
- `DELETE /users/me/tag-preferences/:slug` removes that tag preference.
- Optionally `PATCH /users/me/tag-preferences` supports bulk replacement for the settings page.

A response item should include tag metadata plus the preference kind:

- `id`
- `slug`
- `displayName`
- `postCount`
- `preference`
- `createdAt` or `updatedAt` if useful for sorting the user's lists

## Feed And Recommendation Behavior

Blocked tags should be treated as a hard exclusion on personalized surfaces.

Apply blocked tags to:

- `GET /recommendations`: add a recommendation pipeline filter that removes candidate posts joined to any blocked tag.
- `GET /posts/following`: filter posts from followed users if they contain blocked tags.
- Optionally `GET /posts`: if this is still used as a general feed, filter it too.

Do not apply blocked tags by default to:

- Direct post detail `/posts/:id`, because links should remain resolvable unless moderation hides the post.
- Profile pages, unless the product wants blocked tags to hide content everywhere.
- Tag detail pages `/tags/$slug`, because a user intentionally navigated there. Instead show a blocked-state warning and an unblock action.
- Search results, unless a “hide blocked content from search” setting is explicitly desired.

Preferred tags should affect ranking, not visibility.

Recommended first integration:

- In recommendation candidate/ranking, boost posts that have preferred tags.
- For cold-start users with no analytics vector, preferred tags can seed better results than pure recency.
- When preference changes, invalidate or regenerate the user's recommendation queue, because the queue is persisted and may contain stale items.

Recommendation queue caveat:

- Existing `recommendation_items` are precomputed and served later. If the user blocks a tag, old queued items with that tag should not leak. Either filter blocked tags again during queue read, or clear/unserve existing recommendation items for that user when blocked preferences change. I recommend both for safety: clear stale unserved queue on preference updates and keep a read-time guard.

## AI/MCP Integration

The backend already exposes user identity and interaction context to the AI service through MCP. If chat should explain or respect the user's tag preferences, expose read-only preference data through the identity or interactions MCP server.

Recommended scope for first release:

- Let core web/backend behavior own preference enforcement.
- Add MCP exposure later only if AI tools need to recommend tags, explain recommendations, or avoid blocked topics in generated suggestions.

## Web Pages To Add Or Change

### 1. Settings: `Interests` Tab

Add a new tab to the existing `/settings` route.

Purpose:

- This should be the main management page for preferred and blocked tags.
- Users can see both lists, remove tags, and add tags through tag suggestion search.

Suggested UI sections:

- `Preferred tags`: chips/cards for tags the user wants more of.
- `Blocked tags`: chips/cards for tags the user wants hidden from personalized feeds.
- `Add tag`: autocomplete using existing tag suggestions.
- Conflict handling: if a tag is already preferred and the user blocks it, move it instead of duplicating it.

Why `/settings`:

- The existing settings page owns user-level configuration.
- This feature is about personal feed behavior, not public profile identity.

### 2. Tag Detail Page Enhancements: `/tags/$slug`

Update the existing tag detail page.

Purpose:

- Users browsing a topic should be able to mark it preferred or blocked directly from the tag page.

Suggested additions:

- Header actions: `Prefer`, `Block`, `Unprefer`, `Unblock` depending on current state.
- If blocked, show a clear banner: `You blocked this tag. You can still view it because you opened it directly.`
- Keep `Top` and `Latest` tabs unchanged.

Why not create a new page:

- `/tags/$slug` is already the natural context for a single tag.

### 3. Explore Page Enhancement: Tag Discovery

Enhance `/explore`; do not add a separate tag search page yet.

Purpose:

- Users should discover tags before adding them to preferences.

Suggested additions:

- Add a `Tags` tab beside `Posts` and `People`, or show tag suggestions/trending tags when the query starts with `#`.
- Tag result rows should link to `/tags/$slug` and expose quick actions like `Prefer` or `Block`.
- Keep the existing behavior that exact `#tag` queries navigate to `/tags/$slug`.

### 4. Home Feed Empty/Onboarding State

Update `/` only in the empty or low-signal state.

Purpose:

- Preferred tags are most valuable for cold-start users.

Suggested behavior:

- If `For you` has no good recommendations or the user has no preferences, show a small prompt: `Choose topics to improve your feed` linking to `/settings?tab=interests`.
- Do not add a full onboarding page initially unless the product requires a first-login flow.

### 5. Optional First-Run Onboarding Page

Optional route: `/onboarding/interests`.

Use this only if you want first-time users to choose interests before using the app.

Recommended initial approach:

- Skip this page for the first release.
- Prefer progressive prompts in Home and Settings to keep scope smaller.

## Pages I Would Not Add Initially

Do not add these unless requirements grow:

- A standalone `/interests` page: duplicates `/settings` without a strong reason.
- Separate `/blocked-tags` and `/preferred-tags` pages: too much navigation for a small preference surface.
- Public profile sections showing preferred/blocked tags: blocked tags are private, and preferred tags may reveal interests users did not intend to share.
- Admin pages for user tag preferences: not needed unless moderation/support needs it.

## Privacy And Visibility

Treat both preferred and blocked tags as private user settings by default.

Reasoning:

- Blocked tags can reveal sensitive topics.
- Preferred tags can reveal interests and should not become public accidentally.
- Public profile display can be added later as an explicit opt-in if desired.

## Recommended API/Data Boundaries

Keep these separate:

- `tags`: canonical tag metadata.
- `post_tags`: what tags a post contains.
- `user_tag_preferences`: what a user wants or blocks.
- `user_recommendation_profiles`: vector-based personalization from behavior.
- `recommendation_items`: precomputed output queue.

This separation prevents the explicit preference feature from polluting profile identity or analytics-derived vector state.

## Rollout Plan

Phase 1: Preference Management

- Add user-tag preference storage and APIs.
- Add `/settings` Interests tab.
- Add tag page preference actions.
- Add tests for setting, moving, listing, and deleting preferences.

Phase 2: Block Enforcement

- Add blocked-tag filtering to recommendation generation.
- Add blocked-tag guard when reading queued recommendation items.
- Filter following feed by blocked tags.
- Add integration tests proving blocked posts do not appear.

Phase 3: Preferred Tag Ranking

- Boost preferred-tag posts in recommendation ranking.
- Improve cold-start recommendations using preferred tags.
- Clear/regenerate recommendation queues when preferences change.
- Add tests proving preferred tags influence ranking without excluding other content.

Phase 4: Discovery Polish

- Add tag results or tag suggestions to `/explore`.
- Add home feed prompt for users without interests.
- Optionally add first-run onboarding if needed.

## Open Product Decisions

These are the main choices to confirm before implementation:

- Should blocked tags hide content only from personalized feeds, or everywhere except direct post links?
- Should users be allowed to add preferences for tags that do not exist yet?
- Should preferred tags be private only, or optionally visible on public profiles?
- Should changing preferences immediately regenerate the feed, or is a short delay acceptable?

## Recommended Page Set

Minimum useful release:

- Modify `/settings` with a new `Interests` tab.
- Modify `/tags/$slug` with preferred/blocked actions.
- Lightly modify `/` with a feed-improvement prompt.

Nice-to-have release:

- Enhance `/explore` with tag search/results and quick preference actions.

Avoid initially:

- New standalone interests pages.
- Public profile preference display.
- Admin preference management.

