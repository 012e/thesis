import { Mastra } from "@mastra/core";
import { chatRoute } from "@mastra/ai-sdk";

import { env } from "../env";
import { assistantAgent } from "./agents/assistant";
import { streamRoute } from "./routes/stream";

export const mastra = new Mastra({
  agents: { assistantAgent },
  server: {
    port: env.PORT,
    cors: {
      origin: "*",
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Origin",
        "User-Agent",
        "Accept",
      ],
    },
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
      streamRoute,
    ],
  },
});
