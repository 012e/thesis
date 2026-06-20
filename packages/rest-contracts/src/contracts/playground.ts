import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ExecuteCodeBody, ExecutionResult } from "../schemas/playground";

const c = initContract();

export const playgroundContract = c.router({
  executeCode: {
    method: "POST",
    path: "/playground/execute",
    body: ExecuteCodeBody,
    responses: {
      200: ExecutionResult,
      400: z.null(),
      500: z.null(),
    },
    summary: "Execute code in an isolated Piston sandbox",
  },
});

export type PlaygroundContract = typeof playgroundContract;
