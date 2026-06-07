import { env } from "@/env";

export const DEFAULT_AVATAR_KEY = "defaults/default-avatar.webp";

export function getDefaultAvatarUrl(): string {
  return `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${DEFAULT_AVATAR_KEY}`;
}
