import { z } from "zod";

export const AdminUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AdminUserType = z.infer<typeof AdminUser>;
