import type {
  AgentSkillDto,
  AgentSkillSearchResultDto,
} from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function fetchMyAgentSkills(): Promise<AgentSkillDto[]> {
  const response = await client.listMyAgentSkills();

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body.items;
  }

  throw new Error("Failed to fetch agent skills");
}

export interface SearchAgentSkillsParams {
  q: string;
  limit?: number;
}

export async function searchMyAgentSkills(
  params: SearchAgentSkillsParams,
): Promise<{ items: AgentSkillSearchResultDto[] }> {
  const response = await client.searchMyAgentSkills({
    query: { q: params.q, limit: params.limit },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to search agent skills");
}

export interface CreateAgentSkillInput {
  name: string;
  description: string;
  content: string;
}

export async function createAgentSkill(
  input: CreateAgentSkillInput,
): Promise<AgentSkillDto> {
  const response = await client.createAgentSkill({ body: input });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 201) {
    return response.body;
  }

  throw new Error("Failed to create agent skill");
}

export interface UpdateAgentSkillInput {
  id: string;
  name?: string;
  description?: string;
  content?: string;
}

export async function updateAgentSkill(
  input: UpdateAgentSkillInput,
): Promise<AgentSkillDto | null> {
  const { id, ...body } = input;
  const response = await client.updateAgentSkill({
    params: { id },
    body,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    return null;
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to update agent skill");
}

export async function deleteAgentSkill(id: string): Promise<boolean> {
  const response = await client.deleteAgentSkill({ params: { id } });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    return false;
  }

  if (response.status === 204) {
    return true;
  }

  throw new Error("Failed to delete agent skill");
}

export async function resetAgentSkillsToDefaults(): Promise<AgentSkillDto[]> {
  const response = await client.resetMyAgentSkillsToDefaults({});

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body.items;
  }

  throw new Error("Failed to reset agent skills");
}
