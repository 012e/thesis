import { atom } from "jotai";
import type { PostDto } from "@repo/shared-dto";
import store from "@/lib/atoms/store";

export const createdPostAtom = atom<PostDto | null>(null);
export const createdPostGlowIdAtom = atom<string | null>(null);

export function setCreatedPost(post: PostDto): void {
  store.set(createdPostAtom, post);
  store.set(createdPostGlowIdAtom, post.id);
}

export function clearCreatedPost(postId?: string): void {
  const currentPost = store.get(createdPostAtom);
  if (!postId || currentPost?.id === postId) {
    store.set(createdPostAtom, null);
    store.set(createdPostGlowIdAtom, null);
  }
}

export function clearCreatedPostGlow(postId: string): void {
  if (store.get(createdPostGlowIdAtom) === postId) {
    store.set(createdPostGlowIdAtom, null);
  }
}
