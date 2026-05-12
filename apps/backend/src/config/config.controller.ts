import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { ZodError } from "zod";
import { configContract } from "@repo/rest-contracts";
import { AppConfigSchema } from "./config.registry";
import type { AppConfigNamespace } from "./config.registry";
import { ConfigService } from "./config.service";

const VALID_NAMESPACES = Object.keys(
  AppConfigSchema.shape,
) as AppConfigNamespace[];

@Controller()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @TsRestHandler(configContract.getAll)
  getAll() {
    return tsRestHandler(configContract.getAll, async () => {
      const config = await this.configService.getAll();
      return {
        status: 200,
        body: config,
      };
    });
  }

  @TsRestHandler(configContract.getNamespace)
  getNamespace() {
    return tsRestHandler(configContract.getNamespace, async ({ params }) => {
      const { namespace } = params;

      if (!VALID_NAMESPACES.includes(namespace as AppConfigNamespace)) {
        return { status: 404, body: null };
      }

      const value = await this.configService.get(
        namespace as AppConfigNamespace,
      );
      return { status: 200, body: value };
    });
  }

  @TsRestHandler(configContract.setNamespace)
  setNamespace() {
    return tsRestHandler(
      configContract.setNamespace,
      async ({ params, body }) => {
        const { namespace } = params;

        if (!VALID_NAMESPACES.includes(namespace as AppConfigNamespace)) {
          return { status: 404, body: null };
        }

        try {
          await this.configService.set(
            namespace as AppConfigNamespace,
            body as never,
          );
          const updated = await this.configService.get(
            namespace as AppConfigNamespace,
          );
          return { status: 200, body: updated };
        } catch (error) {
          if (error instanceof ZodError) {
            return {
              status: 400,
              body: { message: error.message },
            };
          }
          throw error;
        }
      },
    );
  }
}
