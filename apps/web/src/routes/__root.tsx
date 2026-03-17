import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";

function RootComponent() {
  const router = useRouterState();
  const isAuthRoute = router.location.pathname.startsWith("/auth");
  const isChatRoute = router.location.pathname.startsWith("/chat");

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {isAuthRoute || isChatRoute ? (
        <Outlet />
      ) : (
        <AppLayout>
          <Outlet />
        </AppLayout>
      )}
      <Toaster richColors />
      <TanStackRouterDevtools />
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
