-- Create BM25 index on posts using ParadeDB pg_search extension.
-- Indexes the full content JSONB column; search targets content.text via dot notation.
-- pg_search is pre-installed and preloaded in the paradedb/paradedb image.
CREATE INDEX posts_search_idx ON posts
USING bm25 (id, content)
WITH (key_field='id');
