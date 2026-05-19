import { atom } from "jotai";
import type { PostDto } from "@repo/shared-dto";
import type { AIContextPayload } from "@repo/shared-dto";
import store from "@/lib/atoms/store";

// ─── Frontend-rich type (holds full DTOs for React state) ─────────────────────
//
// Use AIContext inside React. When sending over the wire, call serializeAIContext()
// first to produce the JSON-safe AIContextPayload (defined in @repo/shared-dto).

export type AIContext =
  | { readonly type: "none" }
  | {
      readonly type: "page";
      readonly page: string;
      readonly label: string;
    }
  | {
      readonly type: "post";
      readonly post: PostDto;
    }
  | {
      readonly type: "user-profile";
      readonly userId: string;
      readonly username: string;
      readonly displayName: string;
    };

// ─── Jotai atom ──────────────────────────────────────────────────────────────

export const globalAIContextAtom = atom<AIContext>({ type: "none" });

// ─── Non-React helpers (use the shared Jotai store directly) ──────────────────
//
// These work outside of React components — e.g. in TanStack Router beforeLoad,
// Jotai effects, or plain utility functions.

export function setGlobalAIContext(ctx: AIContext): void {
  store.set(globalAIContextAtom, ctx);
}

export function getGlobalAIContext(): AIContext {
  return store.get(globalAIContextAtom);
}

// ─── Serialisation ────────────────────────────────────────────────────────────
//
// Converts the rich frontend AIContext to the JSON-safe AIContextPayload
// for inclusion in the AI service request body.

export function serializeAIContext(ctx: AIContext): AIContextPayload {
  switch (ctx.type) {
    case "none":
      return { type: "none" };

    case "page":
      return { type: "page", page: ctx.page, label: ctx.label };

    case "post": {
      const { post } = ctx;
      const textPreview = post.content.text ?? "";
      return {
        type: "post",
        postId: post.id,
        authorUsername: post.author.username ?? post.author.email,
        contentPreview: textPreview.slice(0, 150),
        createdAt: post.createdAt,
      };
    }

    case "user-profile":
      return {
        type: "user-profile",
        userId: ctx.userId,
        username: ctx.username,
        displayName: ctx.displayName,
      };
  }
}
