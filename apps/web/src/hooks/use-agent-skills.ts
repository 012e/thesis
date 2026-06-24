import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createAgentSkill,
  deleteAgentSkill,
  fetchMyAgentSkills,
  searchMyAgentSkills,
  updateAgentSkill,
  type CreateAgentSkillInput,
  type SearchAgentSkillsParams,
  type UpdateAgentSkillInput,
} from "@/lib/api/agent-skills";

export const AGENT_SKILLS_QUERY_KEY = ["agent-skills"] as const;

export function useAgentSkills() {
  return useQuery({
    queryKey: AGENT_SKILLS_QUERY_KEY,
    queryFn: fetchMyAgentSkills,
    staleTime: 30 * 1000,
  });
}

export function useAgentSkillSearch(
  params: SearchAgentSkillsParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...AGENT_SKILLS_QUERY_KEY, "search", params] as const,
    queryFn: () => searchMyAgentSkills(params),
    enabled: enabled && params.q.trim().length > 0,
    staleTime: 10 * 1000,
  });
}

export function useCreateAgentSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentSkillInput) => createAgentSkill(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENT_SKILLS_QUERY_KEY });
    },
  });
}

export function useUpdateAgentSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAgentSkillInput) => updateAgentSkill(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENT_SKILLS_QUERY_KEY });
    },
  });
}

export function useDeleteAgentSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgentSkill(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENT_SKILLS_QUERY_KEY });
    },
  });
}
