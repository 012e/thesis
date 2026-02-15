import { initContract } from "@ts-rest/core";
import type { AppRouter } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const User = z.object({ id: z.string(), username: z.string() });

export const authContract = c.router({
  login: {
    method: "POST",
    path: "/auth/login",
    body: z.object({ username: z.string(), password: z.string() }),
    responses: {
      200: z.object({ token: z.string() }),
      401: z.null(),
    },
    summary: "Login with username/password",
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: {
      200: User,
      401: z.null(),
    },
    summary: "Get current user",
  },
}) satisfies AppRouter;

export type AuthContract = typeof authContract;

export default authContract;
