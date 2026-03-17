import type { PostDto } from "@repo/shared-dto";

const NEW_POSTS_KEY = "new_posts";

/**
 * Get new posts from session storage that haven't been fetched yet
 */
export function getNewPosts(): PostDto[] {
  try {
    const stored = sessionStorage.getItem(NEW_POSTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a new post to session storage (for optimistic UI updates)
 */
export function addNewPost(post: PostDto): void {
  try {
    const existing = getNewPosts();
    const updated = [post, ...existing];
    sessionStorage.setItem(NEW_POSTS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if session storage is not available
  }
}

/**
 * Clear new posts from session storage
 */
export function clearNewPosts(): void {
  try {
    sessionStorage.removeItem(NEW_POSTS_KEY);
  } catch {
    // Silently fail if session storage is not available
  }
}

/**
 * Remove a specific post from session storage
 */
export function removeNewPost(postId: string): void {
  try {
    const existing = getNewPosts();
    const updated = existing.filter((post) => post.id !== postId);
    sessionStorage.setItem(NEW_POSTS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if session storage is not available
  }
}
