import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { UserProfile } from "../schemas/user";

const c = initContract();

export const usersContract = c.router({
  getUserProfile: {
    method: "GET",
    path: "/users/:id/profile",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: UserProfile,
      404: z.null(),
    },
    summary: "Get a user's profile with statistics",
  },
});

export type UsersContract = typeof usersContract;
