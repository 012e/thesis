import { useSession } from "@/hooks/use-session";

/**
 * Returns true if the current user has the "admin" role.
 * Admin roles are stored as comma-separated strings (e.g. "admin,user"),
 * so we split and check for inclusion.
 */
export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role) return false;
  return role
    .split(",")
    .map((r) => r.trim())
    .includes("admin");
}
