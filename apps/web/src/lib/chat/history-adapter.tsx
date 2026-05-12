import { useMemo } from "react";
import {
  useAui,
  type ThreadHistoryAdapter,
  type MessageFormatAdapter,
  type MessageFormatItem,
  type MessageStorageEntry,
  type GenericThreadHistoryAdapter,
  type ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
} from "@assistant-ui/react";

import { client } from "@/lib/api";

/** Builds a ThreadHistoryAdapter backed by the backend /threads/:id/messages API. */
function makeHistoryAdapter(
  aui: ReturnType<typeof useAui>,
): ThreadHistoryAdapter {
  return {
    /** Not called by useChatRuntime — withFormat is used instead. */
    async load(): Promise<ExportedMessageRepository> {
      return { messages: [] };
    },

    /** Not called by useChatRuntime — withFormat is used instead. */
    async append(_item: ExportedMessageRepositoryItem): Promise<void> {},

    /**
     * useChatRuntime calls withFormat(aiSDKV6FormatAdapter) to get a
     * GenericThreadHistoryAdapter that encodes/decodes AI SDK messages.
     */
    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
    ): GenericThreadHistoryAdapter<TMessage> {
      return {
        async load(): Promise<{
          headId?: string | null;
          messages: MessageFormatItem<TMessage>[];
        }> {
          const remoteId = aui.threadListItem().getState().remoteId;
          if (!remoteId) return { messages: [] };

          const { body, status } = await client.listThreadMessages({
            params: { id: remoteId },
          });

          if (status !== 200 || !body || body.messages.length === 0) {
            return { messages: [] };
          }

          return {
            headId: body.headId,
            messages: (
              body.messages as MessageStorageEntry<TStorageFormat>[]
            ).map((stored) => formatAdapter.decode(stored)),
          };
        },

        async append(item: MessageFormatItem<TMessage>): Promise<void> {
          const { remoteId } = await aui.threadListItem().initialize();

          const entry: MessageStorageEntry<TStorageFormat> = {
            id: formatAdapter.getId(item.message),
            parent_id: item.parentId,
            format: formatAdapter.format,
            content: formatAdapter.encode(item),
          };

          await client.appendThreadMessage({
            params: { id: remoteId },
            body: { entry },
          });
        },
      };
    },
  };
}

export function useThreadHistoryAdapter(): ThreadHistoryAdapter {
  const aui = useAui();
  return useMemo(() => makeHistoryAdapter(aui), [aui]);
}
