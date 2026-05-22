import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  Thread,
  CreateThreadBody,
  UpdateThreadTitleBody,
  GenerateThreadTitleBody,
  ThreadTokenUsage,
} from "../schemas/thread";

const c = initContract();

export const threadsContract = c.router({
  listThreads: {
    method: "GET",
    path: "/threads",
    responses: {
      200: z.array(Thread),
    },
    summary: "List all threads for the current user",
  },
  createThread: {
    method: "POST",
    path: "/threads",
    body: CreateThreadBody,
    responses: {
      201: Thread,
    },
    summary: "Create a new thread",
  },
  getThread: {
    method: "GET",
    path: "/threads/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: Thread,
      404: z.null(),
    },
    summary: "Get a thread by ID",
  },
  updateThreadTitle: {
    method: "PATCH",
    path: "/threads/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: UpdateThreadTitleBody,
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Update thread title",
  },
  archiveThread: {
    method: "POST",
    path: "/threads/:id/archive",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Archive a thread",
  },
  unarchiveThread: {
    method: "POST",
    path: "/threads/:id/unarchive",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Unarchive a thread",
  },
  deleteThread: {
    method: "DELETE",
    path: "/threads/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Delete a thread",
  },
  generateThreadTitle: {
    method: "POST",
    path: "/threads/:id/title",
    pathParams: z.object({ id: z.string().uuid() }),
    body: GenerateThreadTitleBody,
    responses: {
      200: z.object({ title: z.string() }),
    },
    summary: "Generate a title for a thread based on messages",
  },
  getThreadTokenUsage: {
    method: "GET",
    path: "/threads/:id/token-usage",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: ThreadTokenUsage,
      404: z.null(),
    },
    summary: "Get AI token usage for a thread's persisted messages",
  },
  listThreadMessages: {
    method: "GET",
    path: "/threads/:id/messages",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({
        headId: z.string().nullable(),
        messages: z.array(z.unknown()),
      }),
      404: z.null(),
    },
    summary: "Get all persisted messages for a thread",
  },
  appendThreadMessage: {
    method: "POST",
    path: "/threads/:id/messages",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({ entry: z.unknown() }),
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.null(),
    },
    summary: "Append a message entry to a thread's history",
  },
});

export type ThreadsContract = typeof threadsContract;
