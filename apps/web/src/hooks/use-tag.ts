import { useQuery } from "@tanstack/react-query";
import { fetchTag } from "@/lib/api/tags";

export function useTag(slug: string) {
  return useQuery({
    queryKey: ["tags", slug],
    queryFn: () => fetchTag(slug),
    enabled: !!slug,
  });
}
