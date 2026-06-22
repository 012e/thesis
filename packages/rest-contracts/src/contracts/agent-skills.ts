import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  AgentSkill,
  AgentSkillsList,
  AgentSkillSearchMode,
  AgentSkillSearchPage,
  CreateAgentSkillBody,
  UpdateAgentSkillBody,
} from "../schemas/agent-skill";

const c = initContract();

export const agentSkillsContract = c.router({
  listMyAgentSkills: {
    method: "GET",
    path: "/users/me/agent-skills",
    responses: {
      200: AgentSkillsList,
    },
    summary:
      "List the authenticated user's agent skills (installs defaults on first access).",
  },
  searchMyAgentSkills: {
    method: "GET",
    path: "/users/me/agent-skills/search",
    query: z.object({
      q: z.string().min(1),
      mode: AgentSkillSearchMode.optional(),
      limit: z.coerce.number().int().positive().max(50).optional(),
    }),
    responses: {
      200: AgentSkillSearchPage,
    },
    summary:
      "Search the authenticated user's agent skills by text or semantic embedding.",
  },
  createAgentSkill: {
    method: "POST",
    path: "/users/me/agent-skills",
    body: CreateAgentSkillBody,
    responses: {
      201: AgentSkill,
    },
    summary: "Create a new agent skill for the authenticated user.",
  },
  updateAgentSkill: {
    method: "PATCH",
    path: "/users/me/agent-skills/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: UpdateAgentSkillBody,
    responses: {
      200: AgentSkill,
      404: z.null(),
    },
    summary: "Update one of the authenticated user's agent skills.",
  },
  deleteAgentSkill: {
    method: "DELETE",
    path: "/users/me/agent-skills/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      204: z.undefined(),
      404: z.null(),
    },
    summary: "Delete one of the authenticated user's agent skills.",
  },
});

export type AgentSkillsContract = typeof agentSkillsContract;
