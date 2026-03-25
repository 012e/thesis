import { z } from "zod";
import { PostAuthor } from "./shared";

export const Comment = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  authorId: z.string(),
  author: PostAuthor,
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateCommentBody = z.object({
  content: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

export type CommentType = z.infer<typeof Comment>;
export type CreateCommentBodyType = z.infer<typeof CreateCommentBody>;
