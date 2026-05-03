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
  IconCodeCircle2,
  IconCodeCircle2Filled,
  IconShield,
  IconShieldFilled,
} from "@tabler/icons-react";
import { UserProfile } from "./user-profile";
import { useNotifications } from "@/hooks/notifications";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";

const baseNavigationItems = [
  { icon: IconHome, selectedIcon: IconHomeFilled, label: "Home", href: "/" },
  {
    icon: IconZoom,
    selectedIcon: IconZoomFilled,
    label: "Explore",
    href: "/explore",
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
    href: "/",
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

export function LeftSidebar() {
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
          ]
        : []),
    ],
    [isAdmin],
  );

  return (
    <div
      className={`flex sticky top-0 flex-col justify-between py-4 h-screen border-r transition-all duration-300 overflow-x-hidden w-68.75}`}
    >
      <div className="flex flex-col gap-2">
        {/* Logo */}
        <Link to="/" className="p-3 w-fit hover:bg-foreground/8">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="w-7 h-7 fill-current"
          >
            <g>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </g>
          </svg>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              aria-label={item.label}
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
