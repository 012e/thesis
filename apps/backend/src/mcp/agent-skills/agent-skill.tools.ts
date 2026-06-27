import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";

import { AgentSkillsService } from "@/agent-skills/agent-skills.service";

type AuthenticatedRequest = {
  user?: {
    id: string;
  };
};

function result(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ ok: true, data }) },
    ],
  };
}

function error(code: "UNAUTHENTICATED" | "NOT_FOUND", message: string) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ ok: false, error: { code, message } }),
      },
    ],
  };
}

@Injectable()
export class AgentSkillTools {
  constructor(private readonly agentSkillsService: AgentSkillsService) {}

  @Tool({
    name: "list_my_agent_skills",
    description:
      "List the current user's agent skills (reusable instructions). Installs " +
      "the default skill set on first access.",
    parameters: z.object({}),
  })
  async listMyAgentSkills(
    _parameters: Record<string, never>,
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");
    return result(await this.agentSkillsService.list(userId));
  }

  @Tool({
    name: "search_my_agent_skills",
    description:
      "Search the current user's agent skills using hybrid BM25 + semantic " +
      "ranking (Reciprocal Rank Fusion). Use this to find the most relevant " +
      "skill before acting on a request.",
    parameters: z.object({
      query: z.string().min(1).describe("What to search for"),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  })
  async searchMyAgentSkills(
    { query, limit }: { query: string; limit: number },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");
    return result(
      await this.agentSkillsService.search(userId, query, limit),
    );
  }

  @Tool({
    name: "create_agent_skill",
    description: "Create a new agent skill for the current user",
    parameters: z.object({
      name: z.string().min(1).max(100).describe("Short, unique skill name"),
      description: z
        .string()
        .max(500)
        .default("")
        .describe("One-line summary of what the skill is for"),
      content: z
        .string()
        .min(1)
        .max(20_000)
        .describe("The skill's instructions"),
    }),
  })
  async createAgentSkill(
    {
      name,
      description,
      content,
    }: { name: string; description: string; content: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");
    return result(
      await this.agentSkillsService.create(userId, {
        name,
        description,
        content,
      }),
    );
  }

  @Tool({
    name: "update_agent_skill",
    description:
      "Update one of the current user's agent skills. Only provided fields " +
      "are changed.",
    parameters: z.object({
      id: z.string().uuid().describe("Skill id"),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      content: z.string().min(1).max(20_000).optional(),
    }),
  })
  async updateAgentSkill(
    {
      id,
      name,
      description,
      content,
    }: {
      id: string;
      name?: string;
      description?: string;
      content?: string;
    },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const updated = await this.agentSkillsService.update(userId, id, {
      name,
      description,
      content,
    });
    if (!updated) return error("NOT_FOUND", `Skill ${id} was not found.`);
    return result(updated);
  }

  @Tool({
    name: "delete_agent_skill",
    description: "Delete one of the current user's agent skills",
    parameters: z.object({
      id: z.string().uuid().describe("Skill id"),
    }),
  })
  async deleteAgentSkill(
    { id }: { id: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const deleted = await this.agentSkillsService.delete(userId, id);
    if (!deleted) return error("NOT_FOUND", `Skill ${id} was not found.`);
    return result({ id, removed: true });
  }
}
