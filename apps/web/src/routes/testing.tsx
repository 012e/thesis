import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useToast as toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/testing")({
  component: TestingPage,
});

function TestingPage() {
  const navigate = useNavigate();
  const { isPending: sessionPending } = useSession();
  const isAdmin = useIsAdmin();

  if (!sessionPending && !isAdmin) {
    navigate({ to: "/" });
    return null;
  }

  if (sessionPending) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Testing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this page to validate global toast styles and interactions.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            toast.headless({
              title: "Headless toast",
              description: "This toast uses your global headless renderer.",
              action: {
                label: "Action",
                onClick: () => {
                  toast.success("Action clicked");
                },
              },
              cancel: {
                label: "Dismiss",
                onClick: () => {},
              },
            });
          }}
        >
          Show Headless Toast
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            toast.success("Success toast from testing route");
          }}
        >
          Show Success Toast
        </Button>
      </div>
    </div>
  );
}
