const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QueueRecommendationCursor = {
  rank: number;
  itemId: string;
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

export const encodeQueueCursor = (cursor: QueueRecommendationCursor): string =>
  encode(cursor);

export const decodeQueueCursor = (
  cursor: string,
): QueueRecommendationCursor | null => {
  const decoded = parseCursor(cursor);
  if (
    typeof decoded === "object" &&
    decoded !== null &&
    "rank" in decoded &&
    "itemId" in decoded &&
    typeof (decoded as { rank: unknown }).rank === "number" &&
    typeof (decoded as { itemId: unknown }).itemId === "string" &&
    UUID_REGEX.test((decoded as { itemId: string }).itemId)
  ) {
    return decoded as QueueRecommendationCursor;
  }

  return null;
};
