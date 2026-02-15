import { Link } from "@tanstack/react-router";
import {
  IconHome,
  IconHomeFilled,
  IconBell,
  IconBellFilled,
  IconMail,
  IconMailFilled,
  IconUsers,
  IconBookmark,
  IconBookmarkFilled,
  IconSparkles,
  IconUser,
  IconUserFilled,
  IconDotsCircleHorizontal,
  IconLayoutDistributeHorizontalFilled,
  IconZoom,
  IconZoomFilled,
  IconStarFilled,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "./user-profile";

const navigationItems = [
  { icon: IconHome, selectedIcon: IconHomeFilled, label: "Home", href: "/" },
  {
    icon: IconZoom,
    selectedIcon: IconZoomFilled,
    label: "Explore",
    href: "/explore",
  }, // Search usually stays the same
  {
    icon: IconBell,
    selectedIcon: IconBellFilled,
    label: "Notifications",
    href: "/notifications",
  },
  {
    icon: IconMail,
    selectedIcon: IconMailFilled,
    label: "Messages",
    href: "/messages",
  },
  {
    icon: IconUsers,
    selectedIcon: IconUsers,
    label: "Communities",
    href: "/communities",
  },
  {
    icon: IconBookmark,
    selectedIcon: IconBookmarkFilled,
    label: "Bookmarks",
    href: "/bookmarks",
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
  {
    icon: IconDotsCircleHorizontal,
    selectedIcon: IconLayoutDistributeHorizontalFilled,
    label: "More",
    href: "/more",
  },
];

export function LeftSidebar() {
  return (
    <div className="flex sticky top-0 flex-col justify-between p-4 h-screen border-r w-[275px]">
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
              className="flex items-center gap-4 px-3 py-3 hover:bg-accent text-xl font-normal transition-colors [&.active]:font-bold"
            >
              {/* We use a function as children to access the isActive state */}
              {({ isActive }) => {
                const Icon = isActive ? item.selectedIcon : item.icon;
                return (
                  <>
                    <Icon className="w-7 h-7" stroke={isActive ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </>
                );
              }}
            </Link>
          ))}
        </nav>

        <Button
          size="lg"
          className="mt-4 w-full font-bold rounded-full text-[15px] h-[52px]"
        >
          Post
        </Button>
      </div>

      <UserProfile />
    </div>
  );
}
