-- Create BM25 index on the Better Auth `user` table for full-text user search.
-- Indexes name, email, and username so callers can discover users by any of these fields.
-- Note: username is nullable — NULL rows are simply not indexed (no error).
-- pg_search is pre-installed and preloaded in the paradedb/paradedb image.
CREATE INDEX user_search_idx ON "user"
USING bm25 (id, name, email, username)
WITH (
  key_field = 'id',
  text_fields = '{"name": {}, "email": {}, "username": {}}'
);
