import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TagPreferenceKindDto } from "@repo/shared-dto";
import {
  deleteMyTagPreference,
  fetchMyTagPreferences,
  setMyTagPreference,
} from "@/lib/api/tags";
import { FOLLOWING_POSTS_QUERY_KEY } from "@/hooks/use-following-posts";
import { RECOMMENDATIONS_QUERY_KEY } from "@/hooks/use-recommendations";

export const TAG_PREFERENCES_QUERY_KEY = ["tags", "preferences"] as const;

export function useTagPreferences() {
  return useQuery({
    queryKey: TAG_PREFERENCES_QUERY_KEY,
    queryFn: fetchMyTagPreferences,
    staleTime: 30 * 1000,
  });
}

export function useTagPreference(slug: string) {
  const preferences = useTagPreferences();
  const preference =
    preferences.data?.preferred.find((tag) => tag.slug === slug) ??
    preferences.data?.blocked.find((tag) => tag.slug === slug) ??
    null;

  return {
    ...preferences,
    preference,
  };
}

function useInvalidateTagPreferenceSurfaces() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: TAG_PREFERENCES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: FOLLOWING_POSTS_QUERY_KEY }),
    ]);
  };
}

export function useSetTagPreference() {
  const invalidate = useInvalidateTagPreferenceSurfaces();

  return useMutation({
    mutationFn: (params: {
      slug: string;
      preference: TagPreferenceKindDto;
    }) => setMyTagPreference(params),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useDeleteTagPreference() {
  const invalidate = useInvalidateTagPreferenceSurfaces();

  return useMutation({
    mutationFn: (slug: string) => deleteMyTagPreference(slug),
    onSuccess: () => {
      void invalidate();
    },
  });
}
