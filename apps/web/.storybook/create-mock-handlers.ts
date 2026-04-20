import { http, HttpResponse, type RequestHandler } from "msw";
import { fake } from "zod-schema-faker/v4";

/**
 * Minimal view of a ts-rest AppRoute as it exists at runtime.
 * ts-rest routes are plain objects — c.router() does not transform them.
 */
interface TsRestRoute {
  method: string;
  path: string;
  query?: { safeParse: (data: unknown) => { success: boolean; error?: unknown } };
  responses?: Record<number, unknown>;
}

function isRoute(value: unknown): value is TsRestRoute {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).method === "string" &&
    typeof (value as Record<string, unknown>).path === "string"
  );
}

/**
 * Recursively walks a ts-rest contract (flat or nested) and returns all route
 * definitions. Nested routers like `{ posts: postsContract, auth: authContract }`
 * are traversed one level deeper.
 */
function flattenContract(contract: Record<string, unknown>): TsRestRoute[] {
  const routes: TsRestRoute[] = [];
  for (const value of Object.values(contract)) {
    if (isRoute(value)) {
      routes.push(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      routes.push(...flattenContract(value as Record<string, unknown>));
    }
  }
  return routes;
}

export interface MockHandlerOptions {
  /**
   * URL prefix prepended to every route path.
   * Supports MSW's glob-style wildcard so any host/port is matched.
   * @default '* /api' (glob wildcard + /api prefix)
   */
  baseUrl?: string;
  /**
   * Per-path response overrides keyed by the ts-rest route path (e.g. `"/posts/:id"`).
   * The factory receives the raw Request and must return the JSON response body.
   * Use this for routes whose Zod schema cannot be faked automatically (e.g. `.refine()`).
   */
  overrides?: Record<string, (req: Request) => unknown | Promise<unknown>>;
}

/**
 * Generates MSW `RequestHandler[]` from any ts-rest contract.
 *
 * Responses are auto-generated from the route's 200/201 Zod schema via
 * `zod-schema-faker/v4`. Call `setFaker(faker)` once in `.storybook/preview.tsx`
 * before using this function.
 *
 * @example
 * // story file
 * parameters: {
 *   msw: {
 *     handlers: [
 *       sessionHandler,
 *       ...createMockHandlers(postsContract),
 *     ],
 *   },
 * }
 *
 * @example
 * // with a custom override for a specific route
 * createMockHandlers(appContract, {
 *   overrides: {
 *     "/posts": () => [{ id: "1", content: { text: "hello" }, ... }],
 *   },
 * })
 */
export function createMockHandlers(
  contract: Record<string, unknown>,
  options: MockHandlerOptions = {},
): RequestHandler[] {
  const { baseUrl = "*/api", overrides = {} } = options;
  const routes = flattenContract(contract);

  return routes.map((route) => {
    const fullPath = `${baseUrl}${route.path}`;
    const method = route.method.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (http as any)[method](
      fullPath,
      async ({ request }: { request: Request }) => {
        // Validate query params if the route defines a query schema
        if (route.query) {
          const url = new URL(request.url);
          const rawParams = Object.fromEntries(url.searchParams);
          const result = route.query.safeParse(rawParams);
          if (!result.success) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return HttpResponse.json(result.error as any, { status: 400 });
          }
        }

        // Use a custom override if one is registered for this route path
        if (overrides[route.path]) {
          const data = await overrides[route.path](request);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return HttpResponse.json(data as any);
        }

        // Auto-generate a response from the success schema (200 takes priority over 201)
        const responseSchema =
          (route.responses as Record<number, unknown> | undefined)?.[200] ??
          (route.responses as Record<number, unknown> | undefined)?.[201];

        if (!responseSchema) {
          return new HttpResponse(null, { status: 204 });
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return HttpResponse.json(fake(responseSchema as any));
        } catch {
          // zod-schema-faker cannot handle some schema types (e.g. z.null(), empty unions).
          // Return a 500 rather than crashing the story.
          return new HttpResponse(null, { status: 500 });
        }
      },
    );
  });
}
