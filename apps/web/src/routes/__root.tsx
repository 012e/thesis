import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useTheme } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout, HomeLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/components/auth-guard";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

function ThemeSync() {
  useTheme();
  return null;
}

function RootComponent() {
  const router = useRouterState();
  const isAuthRoute = router.location.pathname.startsWith("/auth");
  const isChatRoute = router.location.pathname.startsWith("/chat");
  const isApiRoute = router.location.pathname.startsWith("/api");
  const isPlaygroundRoute = router.location.pathname.startsWith("/playground");
  const isHomeRoute = router.location.pathname === "/";

  return (
    <>
      <ThemeSync />
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
