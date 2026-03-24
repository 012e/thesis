import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that wraps protected routes and ensures the user is authenticated.
 * Shows a loading state while checking session, redirects to login if not authenticated.
 * Only auth routes (/auth/*) are public - all other routes require authentication.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, isPending, error } = useSession();
  const navigate = useNavigate();
  const router = useRouterState();

  const isAuthRoute = router.location.pathname.startsWith("/auth");

  useEffect(() => {
    // Don't redirect if we're already on an auth route
    if (isAuthRoute) {
      return;
    }

    // Wait for session check to complete
    if (isPending) {
      return;
    }

    // If no session and not loading, redirect to login
    if (!session && !isPending) {
      navigate({
        to: "/auth/login",
        search: {
          redirect: router.location.href,
        },
      });
    }
  }, [session, isPending, isAuthRoute, navigate, router.location.href]);

  // Show loading state while checking authentication
  if (isPending && !isAuthRoute) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show error state if session check failed
  if (error && !isAuthRoute) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-screen">
        <div className="text-destructive">Failed to load session</div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-muted-foreground hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // If we're on an auth route or have a session, render children
  if (isAuthRoute || session) {
    return <>{children}</>;
  }

  // While redirecting, show nothing
  return null;
}
