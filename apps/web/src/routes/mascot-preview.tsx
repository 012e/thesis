import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconRefresh } from "@tabler/icons-react";

import { Mascot, type MascotActivity } from "@/components/mascot";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/mascot-preview")({
  component: MascotPreviewPage,
});

const MASCOT_ACTIVITIES = [
  "blink",
  "hello",
  "wave",
  "bounce",
  "celebrate",
  "flush",
  "tired",
  "kick",
  "searching",
  "token",
  "peek",
  "dance",
] satisfies MascotActivity[];

const REPLAY_INTERVAL_MS = 5_200;

function MascotPreviewPage() {
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    setPlayKey((current) => current + 1);

    const intervalId = setInterval(() => {
      setPlayKey((current) => current + 1);
    }, REPLAY_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md">
        <h1 className="min-w-0 truncate text-xl font-bold">Mascot Preview</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPlayKey((current) => current + 1)}
        >
          <IconRefresh className="h-4 w-4" />
          Replay
        </Button>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {MASCOT_ACTIVITIES.map((activity) => (
          <article
            key={activity}
            className="border bg-card p-4 text-card-foreground"
          >
            <div className="grid min-h-36 place-items-center rounded-md border border-white/10 bg-black">
              <Mascot
                activity={activity}
                className="size-24"
                label={`${activity} mascot animation`}
                playKey={playKey}
              />
            </div>
            <h2 className="mt-3 truncate font-mono text-sm text-muted-foreground">
              mascot-{activity}.svg
            </h2>
          </article>
        ))}
      </div>
    </>
  );
}
