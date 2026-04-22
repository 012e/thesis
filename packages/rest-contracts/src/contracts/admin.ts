import { initContract } from "@ts-rest/core";
import type { AppRouter } from "@ts-rest/core";
import { z } from "zod";
import { AdminUser } from "../schemas/admin";

const c = initContract();

export const adminContract = c.router({
  listUsers: {
    method: "GET",
    path: "/admin/users",
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).optional(),
      offset: z.coerce.number().int().nonnegative().optional(),
    }),
    responses: {
      200: z.object({
        users: z.array(AdminUser),
        total: z.number().int().nonnegative(),
      }),
      401: z.null(),
      403: z.null(),
    },
    summary: "List all users (admin only)",
  },
}) satisfies AppRouter;

export type AdminContract = typeof adminContract;
