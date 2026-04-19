import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { playgroundContract } from "@repo/rest-contracts";

import { executeCodeSchema } from "./playground.schemas";
import { PlaygroundService } from "./playground.service";

@Controller()
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

  @TsRestHandler(playgroundContract.executeCode)
  executeCode(@Session() _session: UserSession) {
    void _session;
    return tsRestHandler(playgroundContract.executeCode, async ({ body }) => {
      try {
        // Validate input
        const input = executeCodeSchema.parse(body);

        // Execute code in sandbox
        const result = await this.playgroundService.executeCode(input);

        return {
          status: 200,
          body: playgroundContract.executeCode.responses[200].parse(result),
        };
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === "ZodError") {
          return {
            status: 400,
            body: null,
          };
        }

        // Handle execution errors (these are already caught in the service)
        return {
          status: 500,
          body: null,
        };
      }
    });
  }
}
