import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { client } from "@/lib/api";
import { createAssistantStream } from "assistant-stream";
import type { ThreadType } from "@repo/rest-contracts";

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const { body, status } = await client.listThreads();
    if (status !== 200) {
      throw new Error(`Failed to list threads: ${status}`);
    }
    return {
      threads: body.map((thread: ThreadType) => ({
        remoteId: thread.id,
        externalId: thread.externalId ?? undefined,
        status: thread.isArchived ? "archived" : "regular",
        title: thread.title ?? undefined,
      })),
    };
  },
  async initialize(localId) {
    const { body, status } = await client.createThread({
      body: { localId },
    });
    if (status !== 201) {
      throw new Error(`Failed to create thread: ${status}`);
    }
    return {
      remoteId: body.id,
      externalId: body.externalId ?? undefined,
      title: body.title ?? undefined,
    };
  },
  async rename(remoteId, title) {
    const { status } = await client.updateThreadTitle({
      params: { id: remoteId },
      body: { title },
    });
    if (status !== 200) {
      throw new Error(`Failed to rename thread: ${status}`);
    }
  },
  async archive(remoteId) {
    const { status } = await client.archiveThread({
      params: { id: remoteId },
    });
    if (status !== 200) {
      throw new Error(`Failed to archive thread: ${status}`);
    }
  },
  async unarchive(remoteId) {
    const { status } = await client.unarchiveThread({
      params: { id: remoteId },
    });
    if (status !== 200) {
      throw new Error(`Failed to unarchive thread: ${status}`);
    }
  },
  async delete(remoteId) {
    const { status } = await client.deleteThread({
      params: { id: remoteId },
    });
    if (status !== 200) {
      throw new Error(`Failed to delete thread: ${status}`);
    }
  },
  async fetch(remoteId) {
    const { body, status } = await client.getThread({
      params: { id: remoteId },
    });
    if (status !== 200 || !body) {
      throw new Error(`Failed to fetch thread: ${status}`);
    }
    return {
      status: body.isArchived ? "archived" : "regular",
      remoteId: body.id,
      title: body.title ?? undefined,
      externalId: body.externalId ?? undefined,
    };
  },
  async generateTitle(remoteId, unstable_messages) {
    return createAssistantStream(async (controller) => {
      const { body, status } = await client.generateThreadTitle({
        params: { id: remoteId },
        body: { messages: unstable_messages as unknown[] }, // Type assertion might be needed if TS complains
      });
      if (status === 200) {
        controller.appendText(body.title);
      } else {
        // Fallback or error handling
        controller.appendText("New Thread");
      }
    });
  },
};
