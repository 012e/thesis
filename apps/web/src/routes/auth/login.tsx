import { LoginForm } from "@/components/login-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: loginSearchSchema,
  component: RouteComponent,
});

export function RouteComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoginForm className="w-full max-w-md" />
    </div>
  );
}
