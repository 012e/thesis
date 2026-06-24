import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { Achievement } from "../schemas/achievement";

const c = initContract();

export const achievementsContract = c.router({
  getUserAchievements: {
    method: "GET",
    path: "/users/:id/achievements",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: z.object({ achievements: z.array(Achievement) }),
      404: z.null(),
    },
    summary:
      "Get a user's full achievement board (every XP tier, locked or unlocked)",
  },
});

export type AchievementsContract = typeof achievementsContract;
