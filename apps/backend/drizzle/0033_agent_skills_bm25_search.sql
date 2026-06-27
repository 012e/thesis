-- BM25 index on agent_skills for hybrid search (BM25 + pgvector RRF).
-- Indexes name, description, and content so all three fields are searchable.
-- pg_search is pre-installed and preloaded in the paradedb/paradedb image.
CREATE INDEX agent_skills_search_idx ON agent_skills
USING bm25 (id, name, description, content)
WITH (
  key_field = 'id',
  text_fields = '{"name": {}, "description": {}, "content": {}}'
);
