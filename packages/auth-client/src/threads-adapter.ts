import { type RemoteThreadListAdapter } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { type ClientInferRequest, initClient } from "@ts-rest/core";
import { authContract } from "@repo/auth-contracts";

type Client = any; // We can't easily infer the exact client type here without passing initClient args, so using any for now or better type if possible.
// Actually, let's just assume the user passes a client that matches the contract.

export const getThreadListAdapter = (client: {
  listThreads: () => Promise<any>;
  createThread: (args: any) => Promise<any>;
  getThread: (args: any) => Promise<any>;
  updateThreadTitle: (args: any) => Promise<any>;
  archiveThread: (args: any) => Promise<any>;
  unarchiveThread: (args: any) => Promise<any>;
  deleteThread: (args: any) => Promise<any>;
  generateThreadTitle: (args: any) => Promise<any>;
}): RemoteThreadListAdapter => {
  return {
    async list() {
      const response = await client.listThreads();
      if (response.status !== 200) {
        throw new Error("Failed to list threads");
      }
      return {
        threads: response.body.map((thread: any) => ({
          remoteId: thread.id,
          externalId: thread.externalId ?? undefined,
          status: thread.isArchived ? "archived" : "regular",
          title: thread.title ?? undefined,
        })),
      };
    },
    async initialize(localId) {
      const response = await client.createThread({
        body: { localId },
      });
      if (response.status !== 201) {
        throw new Error("Failed to create thread");
      }
      return {
        remoteId: response.body.id,
        externalId: response.body.externalId ?? undefined,
      };
    },
    async rename(remoteId, title) {
      await client.updateThreadTitle({
        params: { id: remoteId },
        body: { title },
      });
    },
    async archive(remoteId) {
      await client.archiveThread({
        params: { id: remoteId },
        body: undefined,
      });
    },
    async unarchive(remoteId) {
      await client.unarchiveThread({
        params: { id: remoteId },
        body: undefined,
      });
    },
    async delete(remoteId) {
      await client.deleteThread({
        params: { id: remoteId },
        body: undefined,
      });
    },
    async fetch(remoteId) {
      const response = await client.getThread({
        params: { id: remoteId },
      });
      if (response.status !== 200) {
        throw new Error("Failed to fetch thread");
      }
      const thread = response.body;
      return {
        status: thread.isArchived ? "archived" : "regular",
        remoteId: thread.id,
        title: thread.title ?? undefined,
      };
    },
    async generateTitle(remoteId, unstable_messages) {
      return createAssistantStream(async (controller) => {
        const response = await client.generateThreadTitle({
          params: { id: remoteId },
          body: { messages: unstable_messages },
        });
        if (response.status === 200) {
          controller.appendText(response.body.title);
        }
        controller.close();
      });
    },
  };
};
