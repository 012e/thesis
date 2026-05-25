import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchTagPosts } from "@/lib/api/tags";

export function useTagPosts(
  slug: string,
  sort: "top" | "latest" = "top",
  limit = 20,
) {
  return useInfiniteQuery({
    queryKey: ["tags", slug, "posts", sort, limit],
    queryFn: async ({ pageParam }) => {
      const result = await fetchTagPosts({ slug, sort, limit, cursor: pageParam });
      return result ?? { items: [], nextCursor: null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined,
    enabled: !!slug,
  });
}
