// ---------------------------------------------------------------------------
// Shared admin types, constants, and helpers
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  createdAt: Date | string;
};

export type UserSession = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
};

export type DialogState =
  | { type: "none" }
  | { type: "ban"; user: AdminUser }
  | { type: "set-role"; user: AdminUser }
  | { type: "sessions"; user: AdminUser }
  | { type: "delete"; user: AdminUser }
  | { type: "impersonate"; user: AdminUser };

export const PAGE_SIZE = 10;

export const BAN_EXPIRY_OPTIONS = [
  { label: "1 hour", value: String(60 * 60) },
  { label: "1 day", value: String(60 * 60 * 24) },
  { label: "7 days", value: String(60 * 60 * 24 * 7) },
  { label: "30 days", value: String(60 * 60 * 24 * 30) },
  { label: "Permanent", value: "permanent" },
];

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isUserAdmin(user: AdminUser): boolean {
  return (
    user.role
      ?.split(",")
      .map((r) => r.trim())
      .includes("admin") ?? false
  );
}
