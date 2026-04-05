import { z } from 'zod';

const pollPostOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const pollPostContentSchema = z.object({
  question: z.string().min(1),
  options: z.array(pollPostOptionSchema).min(2),
  allowsMultipleSelections: z.boolean(),
  closesAt: z.iso.datetime().nullable().optional(),
});

const visualizationDataPointSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
});

const visualizationPostContentSchema = z.object({
  title: z.string().min(1),
  visualizationType: z.enum(['bar', 'line', 'pie', 'table']),
  data: z.array(visualizationDataPointSchema).min(1),
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
});

const postImageSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const postContentSchema = z
  .object({
    text: z.string().min(1).optional(),
    poll: pollPostContentSchema.optional(),
    visualization: visualizationPostContentSchema.optional(),
    images: z.array(postImageSchema).optional(),
  })
  .refine(
    (content) =>
      content.text !== undefined ||
      content.poll !== undefined ||
      content.visualization !== undefined ||
      (content.images !== undefined && content.images.length > 0),
    {
      message:
        'Post content must include at least one of text, poll, visualization, or images',
    },
  );

export const createPostSchema = z.object({
  content: postContentSchema,
});

export const updatePostSchema = z.object({
  content: postContentSchema,
});
