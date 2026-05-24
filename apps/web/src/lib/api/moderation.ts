import type {
  CreateFlagBodyType,
  CreateReportBodyType,
  ModerationFiltersType,
  ModerationValidationGraphType,
  ModerationPageType,
  PostFlagType,
  PostModerationType,
  PostReportType,
  ReportsPageType,
  ReviewModerationBodyType,
} from "@repo/rest-contracts";
import { handleAuthFailure } from "@/lib/auth";
import { client } from "./index";

export async function listModerations(
  filters: ModerationFiltersType = {},
): Promise<ModerationPageType> {
  const response = await client.listModerations({
    query: filters,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to load moderation queue");
}

export async function getModeration(id: string): Promise<PostModerationType> {
  const response = await client.getModeration({
    params: { id },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 404) {
    throw new Error("Moderation record not found");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to load moderation record");
}

export async function getPostValidationStatus(
  postId: string,
): Promise<ModerationValidationGraphType> {
  const response = await client.getPostValidationStatus({
    params: { id: postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to load validation status");
}

export async function reviewModeration(
  id: string,
  body: ReviewModerationBodyType,
): Promise<PostModerationType> {
  const response = await client.reviewModeration({
    params: { id },
    body,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 404) {
    throw new Error("Moderation record not found");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to review moderation record");
}

export async function flagPost(body: CreateFlagBodyType): Promise<PostFlagType> {
  const response = await client.flagPost({ body });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status === 201) {
    return response.body;
  }

  throw new Error("Failed to flag post");
}

export async function listReports(filters: {
  page?: number;
  pageSize?: number;
} = {}): Promise<ReportsPageType> {
  const response = await client.listReports({
    query: filters,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to load reports");
}

export async function reportPost(
  postId: string,
  body: Omit<CreateReportBodyType, "postId">,
): Promise<PostReportType> {
  const response = await client.reportPost({
    params: { id: postId },
    body,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status === 201) {
    return response.body;
  }

  throw new Error("Failed to report post");
}
