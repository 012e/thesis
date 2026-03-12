// Better Auth User type based on database schema
export interface BetterAuthUser {
  id: string;
  email: string;
  username?: string | null;
  name?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  // Add other fields as needed
}
