import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { appContract } from "@repo/rest-contracts";
import { generateOpenApi, SchemaTransformerSync } from "@ts-rest/open-api";
import { z } from "zod";

export const ZOD_4_ASYNC_TRANSFORMER: SchemaTransformerSync = ({ schema }) => {
  if (schema instanceof z.core.$ZodObject) {
    const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" });
    return jsonSchema as any; // Still figuring out the correct type here…
  }
  return null;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @AllowAnonymous()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("openapi")
  @AllowAnonymous()
  getOpenApi() {
    return generateOpenApi(
      appContract,
      {
        info: {
          title: "Posts API",
          version: "1.0.0",
        },
      },
      {
        setOperationId: true,
        schemaTransformer: ZOD_4_ASYNC_TRANSFORMER,
      },
    );
  }
}
