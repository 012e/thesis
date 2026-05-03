import { useState, type FormEvent, type KeyboardEvent } from "react";
import { IconSearch, IconChevronLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { Input } from "@/components/ui/input";
import { WhoToFollow } from "./who-to-follow";
import { NotificationSummary } from "./notification-summary";

interface RightSidebarProps {
  defaultCollapsed?: boolean;
}

export function RightSidebar({ defaultCollapsed = false }: RightSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const { data: session } = useSession();

  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    void navigate({ to: "/explore", search: { q: trimmed, tab: "posts" } });
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submitSearch(searchValue);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    submitSearch(searchValue);
  }

  if (isCollapsed) {
    return (
      <div className="flex sticky top-0 flex-col items-center py-2 px-1 ml-auto h-screen border-l w-12 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 mt-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <IconChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto sticky top-0 py-2 px-4 ml-auto h-screen w-87.5 transition-all duration-300">
      <div className="flex flex-col gap-4">
        {/* Search row with collapse toggle */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search"
              className="pl-12 h-11 rounded-full border-0 bg-muted"
            />
          </form>
        </div>

        {/* Notification Summary */}
        <NotificationSummary />

        {/* Who to Follow - only show if user is logged in */}
        {session?.user && <WhoToFollow currentUserId={session.user.id} />}
      </div>
    </div>
  );
}
