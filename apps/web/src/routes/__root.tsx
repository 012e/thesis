import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout, HomeLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/components/auth-guard";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";

export function ThemeSync() {
  useTheme();
  return null;
}

/**
 * Sets the global AI context whenever the user navigates to a new route.
 *
 * Routes with scrollable post lists (/ and /users/:userId) start as
 * { type: "none" } so usePostInViewTracker in those pages can override
 * with the specific post currently in view.
 *
 * All other content routes receive a page-level context.
 */
export function RouteContextSync() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Post-feed routes — IntersectionObserver takes over once posts render
    if (pathname === "/" || pathname.startsWith("/users/")) {
      setGlobalAIContext({ type: "none" });
      return;
    }

    // Chat / auth / api — no meta context needed
    if (
      pathname.startsWith("/chat") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api")
    ) {
      setGlobalAIContext({ type: "none" });
      return;
    }

    // Named page contexts
    if (pathname.startsWith("/playground")) {
      setGlobalAIContext({
        type: "page",
        page: "playground",
        label: "Playground",
      });
      return;
    }
    if (pathname.startsWith("/explore")) {
      setGlobalAIContext({ type: "page", page: "explore", label: "Explore" });
      return;
    }
    if (pathname.startsWith("/notifications")) {
      setGlobalAIContext({
        type: "page",
        page: "notifications",
        label: "Notifications",
      });
      return;
    }

    // Unknown route — clear context
    setGlobalAIContext({ type: "none" });
  }, [pathname]);

  return null;
}

export function RootComponent() {
  const router = useRouterState();
  const isAuthRoute = router.location.pathname.startsWith("/auth");
  const isChatRoute = router.location.pathname.startsWith("/chat");
  const isApiRoute = router.location.pathname.startsWith("/api");
  const isPlaygroundRoute = router.location.pathname.startsWith("/playground");
  const isHomeRoute = router.location.pathname === "/";

  return (
    <>
      <ThemeSync />
      <RouteContextSync />
      <AuthGuard>
        {isAuthRoute || isChatRoute || isApiRoute || isPlaygroundRoute ? (
          <Outlet />
        ) : isHomeRoute ? (
          <HomeLayout>
            <Outlet />
          </HomeLayout>
        ) : (
          <AppLayout>
            <Outlet />
          </AppLayout>
        )}
      </AuthGuard>
      <Toaster richColors />
      {import.meta.env.DEV ? (
        <TanStackDevtools
          config={{
            position: "bottom-left",
            defaultOpen: false,
          }}
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      ) : null}
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
