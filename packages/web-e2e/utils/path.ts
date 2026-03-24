import { env } from "@/env";

/**
 * Combines the PLAYWRIGHT_BASE_URL with provided path segments.
 * @param paths - Individual path segments (e.g., 'auth', 'login')
 * @returns A fully qualified URL string
 */
export function pathTo(...paths: string[]): string {
  const basePath = env.PLAYWRIGHT_BASE_URL;

  // Join the segments with slashes
  const joinedPaths = paths.join("/");

  // The URL constructor handles joining segments to the base URL correctly
  // Note: For this to work best, ensure PLAYWRIGHT_BASE_URL ends with a /
  const url = new URL(joinedPaths, basePath);

  return url.toString();
}
