import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";

import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({ adminName }: { adminName: string }) {
  const navigate = useNavigate();
  const [stopping, setStopping] = useState(false);

  async function handleStop() {
    setStopping(true);
    try {
      await (
        authClient.admin as Record<string, CallableFunction>
      ).stopImpersonating?.();
      window.location.reload();
      toast.success("Stopped impersonating");
      navigate({ to: "/" });
    } catch {
      toast.error("Failed to stop impersonation");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-yellow-50 px-4 py-2 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
      <div className="flex items-center gap-2 text-xs">
        <IconAlertTriangle className="size-4 shrink-0" />
        <span>
          You are currently impersonating a user. Original admin:{" "}
          <strong>{adminName}</strong>
        </span>
      </div>
      <Button
        size="xs"
        variant="outline"
        onClick={handleStop}
        disabled={stopping}
        className="border-yellow-400 text-yellow-900 hover:bg-yellow-100 dark:text-yellow-200"
      >
        <IconX className="size-3" />
        Stop Impersonating
      </Button>
    </div>
  );
}
