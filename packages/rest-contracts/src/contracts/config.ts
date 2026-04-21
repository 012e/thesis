import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { AppConfigSchema } from "../schemas/config";

const c = initContract();

export const configContract = c.router({
  getAll: {
    method: "GET",
    path: "/config",
    responses: {
      200: AppConfigSchema,
    },
    summary: "Get the full application configuration with schema defaults applied",
  },
  getNamespace: {
    method: "GET",
    path: "/config/:namespace",
    pathParams: z.object({ namespace: z.string() }),
    responses: {
      200: z.unknown(),
      404: z.null(),
    },
    summary: "Get configuration for a specific namespace",
  },
  setNamespace: {
    method: "POST",
    path: "/config/:namespace",
    pathParams: z.object({ namespace: z.string() }),
    body: z.record(z.string(), z.unknown()),
    responses: {
      200: z.unknown(),
      400: z.object({ message: z.string() }),
      404: z.null(),
    },
    summary: "Set configuration for a specific namespace",
  },
});

export type ConfigContract = typeof configContract;
