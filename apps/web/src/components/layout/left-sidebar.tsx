import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconHome,
  IconHomeFilled,
  IconBell,
  IconBellFilled,
  IconUser,
  IconUserFilled,
  IconZoom,
  IconZoomFilled,
  IconRobot,
  IconFlask,
  IconFlaskFilled,
  IconShield,
  IconShieldCheck,
  IconShieldCheckFilled,
  IconShieldFilled,
  IconCodeCircle2,
  IconCodeCircle2Filled,
  IconBookmark,
  IconBookmarkFilled,
} from "@tabler/icons-react";
import { Logo } from "@/components/logo";
import { useNotifications } from "@/hooks/notifications";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";
import { UserProfile } from "./user-profile";

const baseNavigationItems = [
  { icon: IconHome, selectedIcon: IconHomeFilled, label: "Home", href: "/" },
  {
    icon: IconZoom,
    selectedIcon: IconZoomFilled,
    label: "Explore",
    href: "/explore",
  },
  {
    icon: IconBookmark,
    selectedIcon: IconBookmarkFilled,
    label: "Bookmarks",
    href: "/bookmarks",
  },
  {
    icon: IconRobot,
    selectedIcon: IconRobot,
    label: "AI Chat",
    href: "/chat",
  },
  {
    icon: IconBell,
    selectedIcon: IconBellFilled,
    label: "Notifications",
    href: "/notifications",
  },
  {
    icon: IconCodeCircle2,
    selectedIcon: IconCodeCircle2Filled,
    label: "Playground",
    href: "/playground",
  },
  {
    icon: IconUser,
    selectedIcon: IconUserFilled,
    label: "Profile",
    href: "/profile",
  },
];

interface LeftSidebarProps {
  onNavigate?: () => void;
}

export function LeftSidebar({ onNavigate }: LeftSidebarProps) {
  const { unreadCount } = useNotifications();
  const isAdmin = useIsAdmin();

  const navigationItems = useMemo(
    () => [
      ...baseNavigationItems,
      ...(isAdmin
        ? [
            {
              icon: IconShield,
              selectedIcon: IconShieldFilled,
              label: "User Management",
              href: "/admin/users",
            },
            {
              icon: IconShieldCheck,
              selectedIcon: IconShieldCheckFilled,
              label: "Moderation",
              href: "/admin/moderation",
            },
          ]
        : []),
    ],
    [isAdmin],
  );

  return (
    <div className="sticky top-0 flex h-screen w-68.75 flex-col justify-between overflow-x-hidden border-r py-2 transition-all duration-300">
      <div className="flex flex-col gap-2">
        {/* Logo */}
        <Link
          to="/"
          className="w-full hover:bg-foreground/8 h-full px-2.5 py-1"
          onClick={onNavigate}
        >
          <Logo className="h-10 w-22" />
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              aria-label={item.label}
              onClick={onNavigate}
            >
              {({ isActive }) => {
                const Icon = isActive ? item.selectedIcon : item.icon;
                const hasUnread =
                  item.href === "/notifications" && unreadCount > 0;
                return (
                  <div
                    className={cn(
                      "flex items-center gap-4 py-3 px-3 text-xl",
                      isActive
                        ? "bg-accent/20 text-primary font-bold "
                        : "hover:bg-foreground/8 font-normal",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon className="w-7 h-7" stroke={isActive ? 2 : 1.5} />
                      {hasUnread && (
                        <span className="flex absolute -top-1.5 -right-1.5 justify-center items-center px-1 font-bold leading-none rounded-full min-w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="overflow-hidden whitespace-nowrap transition-all duration-300 max-w-50 opacity-100">
                      {item.label}
                    </span>
                  </div>
                );
              }}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <UserProfile />
      </div>
    </div>
  );
}
