import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const Route = createFileRoute("/auth/reset-password")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ResetPasswordForm className="w-full max-w-md" />
    </div>
  );
}
