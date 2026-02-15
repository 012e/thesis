import { Avatar } from "@/components/ui/avatar";
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
  IconHelp,
} from "@tabler/icons-react";
import { logout } from "@/lib/auth";
import { useRouter } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";

export function UserProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/auth/login" });
  };

  const handleViewProfile = () => {
    router.navigate({ to: "/profile" });
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
      <DropdownMenuTrigger className="flex gap-3 items-center p-3 w-full text-left transition-colors hover:bg-accent">
        <Avatar className="w-10 h-10">
          <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
            {initials}
          </div>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{displayName}</div>
          <div className="text-sm text-muted-foreground truncate">
            {displayEmail}
          </div>
        </div>
        <IconDotsCircleHorizontal className="w-5 h-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={handleViewProfile}>
          <IconUser />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <IconSettings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <IconHelp />
          Help & Support
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
