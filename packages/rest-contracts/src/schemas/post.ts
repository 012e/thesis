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

export const PostContent = z
  .object({
    text: z.string().min(1).optional(),
    poll: PollPostContent.optional(),
    visualization: VisualizationPostContent.optional(),
  })
  .refine(
    (content) =>
      content.text !== undefined ||
      content.poll !== undefined ||
      content.visualization !== undefined,
    {
      message:
        "Post content must include at least one of text, poll, or visualization",
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
  currentUserReaction: ReactionType.nullable(),
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

export type PollPostOptionType = z.infer<typeof PollPostOption>;
export type PollPostContentType = z.infer<typeof PollPostContent>;
export type VisualizationDataPointType = z.infer<typeof VisualizationDataPoint>;
export type VisualizationPostContentType = z.infer<
  typeof VisualizationPostContent
>;
export type PostContentType = z.infer<typeof PostContent>;
export type PostType = z.infer<typeof Post>;
export type CreatePostBodyType = z.infer<typeof CreatePostBody>;
export type UpdatePostBodyType = z.infer<typeof UpdatePostBody>;
export type RecommendationPageType = z.infer<typeof RecommendationPage>;
