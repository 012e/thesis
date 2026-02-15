import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/components/register-form";

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <RegisterForm className="w-full max-w-md" />
    </div>
  );
}
