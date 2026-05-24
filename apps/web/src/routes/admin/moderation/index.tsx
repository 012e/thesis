import { Suspense, lazy, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { IconShieldCheck } from "@tabler/icons-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useSession } from "@/hooks/use-session";

import { ModerationDialogs } from "./-moderation-dialogs";
import type { ModerationDialogState } from "./-shared";

const ModerationQueueTab = lazy(() => import("./-queue-tab"));
const ReportsTab = lazy(() => import("./-reports-tab"));

type ModerationTab = "queue" | "reports";

export const Route = createFileRoute("/admin/moderation/")({
  component: AdminModerationPage,
});

export function AdminModerationPage() {
  const { isPending: sessionPending } = useSession();
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState<ModerationTab>("queue");
  const [dialog, setDialog] = useState<ModerationDialogState>({ type: "none" });

  if (sessionPending) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <IconShieldCheck className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Moderation</h1>
          <p className="text-xs text-muted-foreground">
            Review flagged content, LLM decisions, and incoming user reports.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ModerationTab)}
        className="gap-4"
      >
        <TabsList
          variant="line"
          className="flex h-auto max-w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="queue" className="px-2.5 py-1.5">
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="reports" className="px-2.5 py-1.5">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Suspense fallback={<TabFallback />}>
            {activeTab === "queue" ? (
              <ModerationQueueTab enabled setDialog={setDialog} />
            ) : (
              <ReportsTab enabled />
            )}
          </Suspense>
        </TabsContent>
      </Tabs>

      <ModerationDialogs
        dialog={dialog}
        setDialog={setDialog}
        enabled={!sessionPending && isAdmin}
      />
    </div>
  );
}

function TabFallback() {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-none border">
      <Spinner size="md" />
    </div>
  );
}
