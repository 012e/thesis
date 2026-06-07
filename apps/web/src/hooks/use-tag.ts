import { useQuery } from "@tanstack/react-query";
import { fetchTag } from "@/lib/api/tags";

interface UseTagOptions {
  enabled?: boolean;
}

export function useTag(slug: string, options: UseTagOptions = {}) {
  return useQuery({
    queryKey: ["tags", slug],
    queryFn: () => fetchTag(slug),
    enabled: !!slug && (options.enabled ?? true),
  });
}
