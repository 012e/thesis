import { useEffect, useRef } from "react";
import type { PostDto } from "@repo/shared-dto";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";

/**
 * Tracks which post in a scrollable list is most prominently in the viewport
 * and updates the global AI context accordingly.
 *
 * Uses a single IntersectionObserver (not one per post) for performance.
 * Resolves the "winner" post as the one with the highest intersection ratio.
 *
 * When no post is visible (or on unmount), resets context to { type: "none" }.
 *
 * @param posts - The flat list of posts currently rendered in the feed.
 *   The order must match the rendered DOM order so IDs can be looked up.
 */
export function usePostInViewTracker(posts: PostDto[]): void {
  // Keep a stable ref so the observer callback always has the latest posts
  // array without needing to re-create the observer on every render.
  const postsRef = useRef<PostDto[]>(posts);
  useEffect(() => {
    postsRef.current = posts;
  });

  // Derive a stable string key so the observer is only re-created when the
  // set of post IDs actually changes (new page loaded, feed switched, etc.).
  const postIds = posts.map((p) => p.id).join(",");

  useEffect(() => {
    if (postIds === "") {
      setGlobalAIContext({ type: "none" });
      return;
    }

    // Map postId → current intersection ratio for winner resolution.
    const ratioMap = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = (entry.target as HTMLElement).dataset["postId"];
          if (!postId) continue;
          ratioMap.set(postId, entry.intersectionRatio);
        }

        // Find the post with the highest intersection ratio.
        let winnerId: string | null = null;
        let winnerRatio = 0;
        for (const [id, ratio] of ratioMap) {
          if (ratio > winnerRatio) {
            winnerRatio = ratio;
            winnerId = id;
          }
        }

        if (winnerId === null || winnerRatio === 0) {
          // No post is visible — keep the last context rather than flickering
          // to "none" during fast scrolls.
          return;
        }

        const winnerPost = postsRef.current.find((p) => p.id === winnerId);
        if (winnerPost) {
          setGlobalAIContext({ type: "post", post: winnerPost });
        }
      },
      {
        // Shrink the root margin so only posts near the centre of the viewport
        // score high ratios, preventing off-screen posts from winning.
        rootMargin: "-20% 0px -20% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      },
    );

    // Observe every DOM element that carries a data-post-id attribute.
    const elements = document.querySelectorAll<HTMLElement>("[data-post-id]");
    for (const el of elements) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      setGlobalAIContext({ type: "none" });
    };
  }, [postIds]);
}
