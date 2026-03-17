import { Mastra } from "@mastra/core";

import { env } from "../env";
import { assistantAgent } from "./agents/assistant";

export const mastra = new Mastra({
  agents: { assistantAgent },
  server: {
    port: env.PORT,
  },
});
