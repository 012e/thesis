import { Link } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

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
        const initials = user.name
          ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : user.email.charAt(0).toUpperCase();

        return (
          <Link
            key={user.id}
            to="/users/$userId"
            params={{ userId: user.id }}
            className="flex gap-3 items-center py-3 px-4 transition-colors hover:bg-muted/50"
          >
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name || user.username || undefined}
              />
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {user.name || user.username || 'User'}
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
