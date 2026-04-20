import type { Decorator } from "@storybook/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from "@tanstack/react-router";

/**
 * Storybook decorator that wraps stories with a minimal TanStack Router context.
 * Use this for stories that render components containing `<Link>` or `useRouter`.
 *
 * @example
 * export default {
 *   decorators: [withRouter()],
 * } satisfies Meta<...>;
 */
export function withRouter(initialPath = "/"): Decorator {
  return (Story) => {
    // Wrap Story in a React component so TanStack Router can render it
    const StoryComponent = () => <>{Story()}</>;

    const rootRoute = createRootRoute({ component: Outlet });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: StoryComponent,
    });
    const catchAllRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "$",
      component: StoryComponent,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, catchAllRoute]),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });

    return <RouterProvider router={router} />;
  };
}
