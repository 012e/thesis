import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { agentSkillsContract } from "@repo/rest-contracts";

import { AgentSkillsService } from "./agent-skills.service";

@Controller()
export class AgentSkillsController {
  constructor(private readonly agentSkillsService: AgentSkillsService) {}

  @TsRestHandler(agentSkillsContract.listMyAgentSkills)
  listMyAgentSkills(@Session() session: UserSession) {
    return tsRestHandler(agentSkillsContract.listMyAgentSkills, async () => {
      const items = await this.agentSkillsService.list(session.user.id);
      return {
        status: 200 as const,
        body: agentSkillsContract.listMyAgentSkills.responses[200].parse({
          items,
        }),
      };
    });
  }

  @TsRestHandler(agentSkillsContract.searchMyAgentSkills)
  searchMyAgentSkills(@Session() session: UserSession) {
    return tsRestHandler(
      agentSkillsContract.searchMyAgentSkills,
      async ({ query }) => {
        const result = await this.agentSkillsService.search(
          session.user.id,
          query.q,
          query.limit,
        );
        return {
          status: 200 as const,
          body: agentSkillsContract.searchMyAgentSkills.responses[200].parse(
            result,
          ),
        };
      },
    );
  }

  @TsRestHandler(agentSkillsContract.createAgentSkill)
  createAgentSkill(@Session() session: UserSession) {
    return tsRestHandler(
      agentSkillsContract.createAgentSkill,
      async ({ body }) => {
        const skill = await this.agentSkillsService.create(
          session.user.id,
          body,
        );
        return {
          status: 201 as const,
          body: agentSkillsContract.createAgentSkill.responses[201].parse(skill),
        };
      },
    );
  }

  @TsRestHandler(agentSkillsContract.updateAgentSkill)
  updateAgentSkill(@Session() session: UserSession) {
    return tsRestHandler(
      agentSkillsContract.updateAgentSkill,
      async ({ params, body }) => {
        const skill = await this.agentSkillsService.update(
          session.user.id,
          params.id,
          body,
        );
        if (!skill) {
          return { status: 404 as const, body: null };
        }
        return {
          status: 200 as const,
          body: agentSkillsContract.updateAgentSkill.responses[200].parse(skill),
        };
      },
    );
  }

  @TsRestHandler(agentSkillsContract.deleteAgentSkill)
  deleteAgentSkill(@Session() session: UserSession) {
    return tsRestHandler(
      agentSkillsContract.deleteAgentSkill,
      async ({ params }) => {
        const deleted = await this.agentSkillsService.delete(
          session.user.id,
          params.id,
        );
        if (!deleted) {
          return { status: 404 as const, body: null };
        }
        return { status: 204 as const, body: undefined };
      },
    );
  }

  @TsRestHandler(agentSkillsContract.resetMyAgentSkillsToDefaults)
  resetMyAgentSkillsToDefaults(@Session() session: UserSession) {
    return tsRestHandler(
      agentSkillsContract.resetMyAgentSkillsToDefaults,
      async () => {
        const items = await this.agentSkillsService.resetToDefaults(
          session.user.id,
        );
        return {
          status: 200 as const,
          body: agentSkillsContract.resetMyAgentSkillsToDefaults.responses[200].parse(
            { items },
          ),
        };
      },
    );
  }
}
