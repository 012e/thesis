import { z } from "zod";
import { PostAuthor, ReactionType } from "./shared";

export const PollPostOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const PollPostContent = z.object({
  question: z.string().min(1),
  options: z.array(PollPostOption).min(2),
  allowsMultipleSelections: z.boolean(),
  closesAt: z.string().datetime().nullable().optional(),
});

export const VisualizationDataPoint = z.object({
  label: z.string().min(1),
  value: z.number(),
});

export const VisualizationPostContent = z.object({
  title: z.string().min(1),
  visualizationType: z.enum(["bar", "line", "pie", "table"]),
  data: z.array(VisualizationDataPoint).min(1),
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
});

export const PostImage = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const PostContent = z
  .object({
    text: z.string().min(1).optional(),
    poll: PollPostContent.optional(),
    visualization: VisualizationPostContent.optional(),
    images: z.array(PostImage).max(4).optional(),
  })
  .refine(
    (content) =>
      content.text !== undefined ||
      content.poll !== undefined ||
      content.visualization !== undefined ||
      (content.images !== undefined && content.images.length > 0),
    {
      message:
        "Post content must include at least one of text, poll, visualization, or images",
    },
  );

export const Post = z.object({
  id: z.string().uuid(),
  authorId: z.string(),
  author: PostAuthor,
  content: PostContent,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  upvoteCount: z.number().int().nonnegative(),
  downvoteCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  currentUserReaction: ReactionType.nullable(),
  currentUserSubscribed: z.boolean(),
});

export const PostSubscription = z.object({
  postId: z.string().uuid(),
  userId: z.string(),
  createdAt: z.string().datetime(),
});

export const CreatePostBody = z.object({
  content: PostContent,
});

export const UpdatePostBody = z.object({
  content: PostContent,
});

export const RecommendationPage = z.object({
  items: z.array(Post),
  nextCursor: z.string().nullable(),
});

export const FollowingFeedPage = z.object({
  items: z.array(Post),
  nextCursor: z.string().nullable(),
});

export type PollPostOptionType = z.infer<typeof PollPostOption>;
export type PollPostContentType = z.infer<typeof PollPostContent>;
export type VisualizationDataPointType = z.infer<typeof VisualizationDataPoint>;
export type VisualizationPostContentType = z.infer<
  typeof VisualizationPostContent
>;
export type PostImageType = z.infer<typeof PostImage>;
export type PostContentType = z.infer<typeof PostContent>;
export type PostType = z.infer<typeof Post>;
export type PostSubscriptionType = z.infer<typeof PostSubscription>;
export type CreatePostBodyType = z.infer<typeof CreatePostBody>;
export type UpdatePostBodyType = z.infer<typeof UpdatePostBody>;
export type RecommendationPageType = z.infer<typeof RecommendationPage>;
export type FollowingFeedPageType = z.infer<typeof FollowingFeedPage>;
