import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconHome,
  IconHomeFilled,
  IconBell,
  IconBellFilled,
  IconUsers,
  IconSparkles,
  IconUser,
  IconUserFilled,
  IconZoom,
  IconZoomFilled,
  IconStarFilled,
  IconRobot,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconCodeDots,
  IconCodeCircle2,
  IconCodeCircle2Filled,
} from "@tabler/icons-react";
import { UserProfile } from "./user-profile";
import { useNotifications } from "@/hooks/notifications";

const navigationItems = [
  { icon: IconHome, selectedIcon: IconHomeFilled, label: "Home", href: "/" },
  {
    icon: IconZoom,
    selectedIcon: IconZoomFilled,
    label: "Explore",
    href: "/explore",
  },
  {
    icon: IconBell,
    selectedIcon: IconBellFilled,
    label: "Notifications",
    href: "/notifications",
  },
  {
    icon: IconRobot,
    selectedIcon: IconRobot,
    label: "AI Chat",
    href: "/chat",
  },
  {
    icon: IconCodeCircle2,
    selectedIcon: IconCodeCircle2Filled,
    label: "Playground",
    href: "/playground",
  },
  {
    icon: IconUsers,
    selectedIcon: IconUsers,
    label: "Communities",
    href: "/communities",
  },
  {
    icon: IconSparkles,
    selectedIcon: IconStarFilled,
    label: "Premium",
    href: "/premium",
  },
  {
    icon: IconUser,
    selectedIcon: IconUserFilled,
    label: "Profile",
    href: "/profile",
  },
];

interface LeftSidebarProps {
  defaultCollapsed?: boolean;
}

export function LeftSidebar({ defaultCollapsed = false }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const { unreadCount } = useNotifications();

  return (
    <div
      className={`flex sticky top-0 flex-col justify-between py-4 h-screen border-r transition-all duration-300 overflow-x-hidden ${isCollapsed ? "w-[80px]" : "w-[275px]"}`}
    >
      <div className="flex flex-col gap-2">
        {/* Logo */}
        <Link to="/" className="p-3 w-fit hover:bg-accent">
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
              className={`flex items-center gap-4 py-3 hover:bg-accent text-xl font-normal transition-all duration-300 [&.active]:font-bold ${isCollapsed ? "pl-[26px]" : "px-3"}`}
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
            >
              {/* We use a function as children to access the isActive state */}
              {({ isActive }) => {
                const Icon = isActive ? item.selectedIcon : item.icon;
                const hasUnread =
                  item.href === "/notifications" && unreadCount > 0;
                return (
                  <>
                    <div className="relative flex-shrink-0">
                      <Icon className="w-7 h-7" stroke={isActive ? 2 : 1.5} />
                      {hasUnread && (
                        <span className="flex absolute -top-1.5 -right-1.5 justify-center items-center px-1 font-bold leading-none rounded-full min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span
                      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"}`}
                    >
                      {item.label}
                    </span>
                  </>
                );
              }}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`flex items-center gap-2 py-3 w-full hover:bg-accent transition-all duration-300 ${isCollapsed ? "pl-[28px]" : "px-3"}`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <IconChevronRight className="flex-shrink-0 w-6 h-6" />
          ) : (
            <IconChevronLeft className="flex-shrink-0 w-6 h-6" />
          )}
          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"}`}
          >
            Collapse
          </span>
        </button>

        <UserProfile isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
