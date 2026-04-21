import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/components/auth-guard";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

function RootComponent() {
  const router = useRouterState();
  const isAuthRoute = router.location.pathname.startsWith("/auth");
  const isChatRoute = router.location.pathname.startsWith("/chat");
  const isApiRoute = router.location.pathname.startsWith("/api");
  const isPlaygroundRoute = router.location.pathname.startsWith("/playground");

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthGuard>
        {isAuthRoute || isChatRoute || isApiRoute || isPlaygroundRoute ? (
          <Outlet />
        ) : (
          <AppLayout>
            <Outlet />
          </AppLayout>
        )}
      </AuthGuard>
      <Toaster richColors />
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
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
