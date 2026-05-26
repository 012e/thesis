import { BadRequestException } from "@nestjs/common";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type CreatedAtCursor = {
  createdAt: string;
  postId: string;
};

export type RecommendationCursor = {
  reactionCount: number;
  postId: string;
};

const encode = (cursor: object): string => {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
};

const parseCursor = (cursor: string): unknown | null => {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as
      | unknown
      | null;
  } catch {
    return null;
  }
};

export const encodeCreatedAtCursor = (cursor: CreatedAtCursor): string =>
  encode(cursor);

export const decodeCreatedAtCursor = (
  cursor: string,
  options: { throwOnInvalidDate?: boolean } = {},
): CreatedAtCursor | null => {
  const decoded = parseCursor(cursor);
  if (
    typeof decoded === "object" &&
    decoded !== null &&
    "createdAt" in decoded &&
    "postId" in decoded &&
    typeof (decoded as { createdAt: unknown }).createdAt === "string" &&
    typeof (decoded as { postId: unknown }).postId === "string" &&
    ISO8601_REGEX.test((decoded as { createdAt: string }).createdAt) &&
    UUID_REGEX.test((decoded as { postId: string }).postId)
  ) {
    const parsed = decoded as CreatedAtCursor;
    const date = new Date(parsed.createdAt);
    if (!isFinite(date.getTime())) {
      if (options.throwOnInvalidDate) {
        throw new BadRequestException("Invalid date in cursor");
      }
      return null;
    }
    return parsed;
  }

  return null;
};

export const encodeRecommendationCursor = (
  cursor: RecommendationCursor,
): string => encode(cursor);

export const decodeRecommendationCursor = (
  cursor: string,
): RecommendationCursor | null => {
  const decoded = parseCursor(cursor);
  if (
    typeof decoded === "object" &&
    decoded !== null &&
    "reactionCount" in decoded &&
    "postId" in decoded &&
    typeof (decoded as { reactionCount: unknown }).reactionCount === "number" &&
    typeof (decoded as { postId: unknown }).postId === "string" &&
    UUID_REGEX.test((decoded as { postId: string }).postId)
  ) {
    return decoded as RecommendationCursor;
  }

  return null;
};
