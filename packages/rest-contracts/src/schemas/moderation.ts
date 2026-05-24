import { z } from "zod";
import { Post } from "./post";
import { PostAuthor } from "./shared";

export const ModerationStatus = z.enum([
  "pending",
  "approved",
  "rejected",
  "needs_human_review",
]);

export const ModerationSource = z.enum([
  "auto_duplicate",
  "auto_harmful",
  "user_report",
  "admin_flag",
]);

export const FlagPriority = z.enum(["low", "medium", "high", "critical"]);

export const ReportReason = z.enum([
  "spam",
  "harassment",
  "misinformation",
  "hate_speech",
  "violence",
  "inappropriate",
  "copyright",
  "other",
]);

export const PostModeration = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  source: ModerationSource,
  status: ModerationStatus,
  priority: FlagPriority,
  llmConfidence: z.string().nullable(),
  llmSummary: z.string().nullable(),
  similarPostId: z.string().uuid().nullable(),
  similarityScore: z.string().nullable(),
  moderationResult: z.unknown().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  post: Post.optional(),
  similarPost: Post.optional(),
});

export const PostReport = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  reporterId: z.string(),
  reason: ReportReason,
  description: z.string().nullable(),
  passedHeuristic: z.boolean(),
  moderationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  reporter: PostAuthor.optional(),
});

export const PostFlag = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  flaggedBy: z.string(),
  priority: FlagPriority,
  reason: z.string().nullable(),
  moderationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateFlagBody = z.object({
  postId: z.string().uuid(),
  priority: FlagPriority,
  reason: z.string().min(1).optional(),
});

export const CreateReportBody = z.object({
  postId: z.string().uuid(),
  reason: ReportReason,
  description: z.string().min(1).max(2000).optional(),
});

export const ReviewModerationBody = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(2000).optional(),
});

export const ModerationValidationStepStatus = z.enum([
  "passed",
  "blocked",
  "needs_human_review",
  "pending",
  "not_run",
]);

export const ModerationValidationPipeline = z.enum([
  "duplication",
  "harmful_content",
  "user_report",
  "decision",
]);

export const ModerationValidationGraphNode = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string(),
    pipeline: ModerationValidationPipeline,
    status: ModerationValidationStepStatus,
    message: z.string().nullable(),
    detail: z.string().nullable(),
  }),
});

export const ModerationValidationGraphEdge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean().optional(),
  label: z.string().optional(),
});

export const ModerationValidationGraph = z.object({
  postId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  nodes: z.array(ModerationValidationGraphNode),
  edges: z.array(ModerationValidationGraphEdge),
});

export const ModerationPage = z.object({
  items: z.array(PostModeration),
  total: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
});

export const ModerationFilters = z.object({
  status: ModerationStatus.optional(),
  source: ModerationSource.optional(),
  priority: FlagPriority.optional(),
  page: z.coerce.number().int().nonnegative().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const ReportsPage = z.object({
  items: z.array(PostReport),
  total: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
});

export type ModerationStatusType = z.infer<typeof ModerationStatus>;
export type ModerationSourceType = z.infer<typeof ModerationSource>;
export type FlagPriorityType = z.infer<typeof FlagPriority>;
export type ReportReasonType = z.infer<typeof ReportReason>;
export type PostModerationType = z.infer<typeof PostModeration>;
export type PostReportType = z.infer<typeof PostReport>;
export type PostFlagType = z.infer<typeof PostFlag>;
export type CreateFlagBodyType = z.infer<typeof CreateFlagBody>;
export type CreateReportBodyType = z.infer<typeof CreateReportBody>;
export type ReviewModerationBodyType = z.infer<typeof ReviewModerationBody>;
export type ModerationValidationStepStatusType = z.infer<
  typeof ModerationValidationStepStatus
>;
export type ModerationValidationPipelineType = z.infer<
  typeof ModerationValidationPipeline
>;
export type ModerationValidationGraphNodeType = z.infer<
  typeof ModerationValidationGraphNode
>;
export type ModerationValidationGraphEdgeType = z.infer<
  typeof ModerationValidationGraphEdge
>;
export type ModerationValidationGraphType = z.infer<
  typeof ModerationValidationGraph
>;
export type ModerationPageType = z.infer<typeof ModerationPage>;
export type ModerationFiltersType = z.infer<typeof ModerationFilters>;
export type ReportsPageType = z.infer<typeof ReportsPage>;
