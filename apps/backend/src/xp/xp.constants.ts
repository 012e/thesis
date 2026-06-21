/**
 * Reputation (XP) tuning constants. These are deliberately product knobs kept
 * in one place so the economy can be re-balanced without touching call sites.
 */

/** XP awarded to the post author when their post is upvoted. */
export const XP_POST_UPVOTE = 5;

/** XP awarded to the comment author when their comment is upvoted. */
export const XP_COMMENT_UPVOTE = 3;

/** XP awarded to the answerer when the asker accepts their answer. */
export const XP_ANSWER_ACCEPTED = 15;

/**
 * Maximum vote-driven XP a single user can earn per day. Accepting answers is
 * exempt — only upvote-based reasons count toward this cap. A first-line guard
 * against farming until proper vote-weighting lands.
 */
export const XP_DAILY_VOTE_CAP = 200;

/** Reasons that count toward the daily vote cap. */
export const XP_VOTE_REASONS = ["post_upvote", "comment_upvote"] as const;
