import { createFileRoute } from "@tanstack/react-router";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { env } from "@/env";
import { authClient } from "@repo/auth-client";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/api")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: response } = useSuspenseQuery({
    queryFn: () => authClient.token(),
    queryKey: ["access token"],
  });
  return (
    <ApiReferenceReact
      configuration={{
        url: env.VITE_BACKEND_URL + "openapi",
        authentication: {
          preferredSecurityScheme: "httpBearer",
          securitySchemes: {
            httpBearer: {
              name: "Authorization",
              in: "header",
              value: `Bearer ${response.data.token}`,
            },
          },
        },
      }}
    />
  );
}
