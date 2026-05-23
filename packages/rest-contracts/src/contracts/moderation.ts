import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  PostModeration,
  ModerationPage,
  ModerationFilters,
  CreateFlagBody,
  PostFlag,
  CreateReportBody,
  PostReport,
  ReviewModerationBody,
  ReportsPage,
} from "../schemas/moderation";

const c = initContract();

export const moderationContract = c.router({
  listModerations: {
    method: "GET",
    path: "/admin/moderation",
    query: ModerationFilters,
    responses: {
      200: ModerationPage,
      403: z.null(),
    },
    summary: "List moderation records with filters (admin only)",
  },
  getModeration: {
    method: "GET",
    path: "/admin/moderation/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: PostModeration,
      403: z.null(),
      404: z.null(),
    },
    summary: "Get a single moderation record (admin only)",
  },
  reviewModeration: {
    method: "PUT",
    path: "/admin/moderation/:id/review",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ReviewModerationBody,
    responses: {
      200: PostModeration,
      403: z.null(),
      404: z.null(),
    },
    summary: "Review a moderation record — approve or reject (admin only)",
  },
  flagPost: {
    method: "POST",
    path: "/admin/moderation/flags",
    body: CreateFlagBody,
    responses: {
      201: PostFlag,
      403: z.null(),
      404: z.null(),
    },
    summary: "Flag a post manually with a priority level (admin only)",
  },
  listReports: {
    method: "GET",
    path: "/admin/moderation/reports",
    query: z.object({
      page: z.coerce.number().int().nonnegative().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
    }),
    responses: {
      200: ReportsPage,
      403: z.null(),
    },
    summary: "List user reports (admin only)",
  },
  reportPost: {
    method: "POST",
    path: "/posts/:id/report",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CreateReportBody.omit({ postId: true }),
    responses: {
      201: PostReport,
      404: z.null(),
    },
    summary: "Report a post for review",
  },
});

export type ModerationContract = typeof moderationContract;
