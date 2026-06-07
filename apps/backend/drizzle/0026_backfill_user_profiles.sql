INSERT INTO "user_profiles" ("user_id", "avatar_url")
SELECT "id", 'https://minio.toin.dev/posts-images/defaults/default-avatar.webp'
FROM "user"
ON CONFLICT ("user_id") DO NOTHING;

UPDATE "user_profiles"
SET "avatar_url" = 'https://minio.toin.dev/posts-images/defaults/default-avatar.webp'
WHERE "avatar_url" IS NULL;
