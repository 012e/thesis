import { createFileRoute } from "@tanstack/react-router";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { env } from "@/env";
import { useAtomValue } from "jotai";
import bearerToken from "@/lib/atoms/bearer-token";

export const Route = createFileRoute("/api")({
  component: RouteComponent,
});

export function RouteComponent() {
  const token = useAtomValue(bearerToken);
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
              value: `Bearer ${token}`,
            },
          },
        },
      }}
    />
  );
}
