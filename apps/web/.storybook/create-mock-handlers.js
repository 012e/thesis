import { http, HttpResponse } from "msw";
import { fake } from "zod-schema-faker/v4";
function isRoute(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value.method === "string" &&
        typeof value.path === "string");
}
/**
 * Recursively walks a ts-rest contract (flat or nested) and returns all route
 * definitions. Nested routers like `{ posts: postsContract, auth: authContract }`
 * are traversed one level deeper.
 */
function flattenContract(contract) {
    const routes = [];
    for (const value of Object.values(contract)) {
        if (isRoute(value)) {
            routes.push(value);
        }
        else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            routes.push(...flattenContract(value));
        }
    }
    return routes;
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
export function createMockHandlers(contract, options = {}) {
    const { baseUrl = "*/api", overrides = {} } = options;
    const routes = flattenContract(contract);
    return routes.map((route) => {
        const fullPath = `${baseUrl}${route.path}`;
        const method = route.method.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return http[method](fullPath, async ({ request }) => {
            // Validate query params if the route defines a query schema
            if (route.query) {
                const url = new URL(request.url);
                const rawParams = Object.fromEntries(url.searchParams);
                const result = route.query.safeParse(rawParams);
                if (!result.success) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return HttpResponse.json(result.error, { status: 400 });
                }
            }
            // Use a custom override if one is registered for this route path
            if (overrides[route.path]) {
                const data = await overrides[route.path](request);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return HttpResponse.json(data);
            }
            // Auto-generate a response from the success schema (200 takes priority over 201)
            const responseSchema = route.responses?.[200] ??
                route.responses?.[201];
            if (!responseSchema) {
                return new HttpResponse(null, { status: 204 });
            }
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return HttpResponse.json(fake(responseSchema));
            }
            catch {
                // zod-schema-faker cannot handle some schema types (e.g. z.null(), empty unions).
                // Return a 500 rather than crashing the story.
                return new HttpResponse(null, { status: 500 });
            }
        });
    });
}
