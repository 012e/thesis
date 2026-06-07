import { z } from "zod";

export const PostTag = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
});

export const Tag = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  postCount: z.number().int().nonnegative(),
});

export const TrendingTag = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  postCount: z.number().int().nonnegative(),
  recentCount: z.number().int().nonnegative(),
});

export const TrendingTagsPage = z.object({
  items: z.array(TrendingTag),
});

export const TagSuggestion = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  postCount: z.number().int().nonnegative(),
});

export const TagSuggestionsPage = z.object({
  items: z.array(TagSuggestion),
});

export const TagPreferenceKind = z.enum(["preferred", "blocked"]);

export const TagPreference = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  postCount: z.number().int().nonnegative(),
  preference: TagPreferenceKind,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserTagPreferences = z.object({
  preferred: z.array(TagPreference),
  blocked: z.array(TagPreference),
});

export type PostTagType = z.infer<typeof PostTag>;
export type TagType = z.infer<typeof Tag>;
export type TrendingTagType = z.infer<typeof TrendingTag>;
export type TrendingTagsPageType = z.infer<typeof TrendingTagsPage>;
export type TagSuggestionType = z.infer<typeof TagSuggestion>;
export type TagSuggestionsPageType = z.infer<typeof TagSuggestionsPage>;
export type TagPreferenceKindType = z.infer<typeof TagPreferenceKind>;
export type TagPreferenceType = z.infer<typeof TagPreference>;
export type UserTagPreferencesType = z.infer<typeof UserTagPreferences>;
