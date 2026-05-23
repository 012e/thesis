import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconDotsCircleHorizontal,
  IconUser,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { logout } from "@/lib/auth";
import { useRouter } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { useUserProfile } from "@/hooks/use-user-profile";

interface UserProfileProps {
  isCollapsed?: boolean;
}

export function UserProfile({ isCollapsed = false }: UserProfileProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: profile } = useUserProfile(session?.user.id ?? "");

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/auth/login" });
  };

  const handleViewProfile = () => {
    router.navigate({ to: "/profile" });
  };

  const handleSettings = () => {
    router.navigate({ to: "/settings" });
  };

  const user = session?.user;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex gap-3 items-center w-full text-left transition-all duration-300 hover:bg-accent py-3 ${isCollapsed ? "pl-5" : "px-3"}`}
        title={isCollapsed ? displayName : undefined}
        aria-label={isCollapsed ? displayName : undefined}
      >
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage
            src={profile?.image ?? undefined}
            alt={user?.name || undefined}
          />
          <AvatarFallback className="font-semibold bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={`flex items-center gap-3 flex-1 min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-full opacity-100"}`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-sm text-muted-foreground truncate">
              {displayEmail}
            </div>
          </div>
          <IconDotsCircleHorizontal className="w-5 h-5 shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={handleViewProfile}>
          <IconUser />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettings}>
          <IconSettings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <IconLogout />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
