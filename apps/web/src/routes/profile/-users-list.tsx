import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";

type User = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
};

type UsersListProps = {
  users: User[];
  emptyMessage: string;
};

export function UsersList({ users, emptyMessage }: UsersListProps) {
  if (users.length === 0) {
    return (
      <Card className="gap-0 p-8 text-center">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden gap-0 p-0 divide-y divide-border">
      {users.map((user) => {
        return (
          <Link
            key={user.id}
            to="/users/$userId"
            params={{ userId: user.id }}
            className="flex gap-3 items-center py-3 px-4 transition-colors hover:bg-muted/50"
          >
            <UserAvatar
              userId={user.id}
              src={user.image}
              name={user.name}
              className="w-10 h-10 shrink-0 text-sm font-semibold text-primary"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {user.name || user.username || "User"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user.username ? `@${user.username}` : user.email}
              </span>
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
