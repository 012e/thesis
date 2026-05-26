import { createContext, useContext, type ReactNode } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import type { AnalyticsEventInput } from "@repo/rest-contracts";

type TrackFn = (
  type: AnalyticsEventInput["type"],
  metadata?: Record<string, unknown>,
) => void;

interface AnalyticsContextValue {
  track: TrackFn;
  flush: () => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = useAnalytics();

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Access the analytics `track` and `flush` functions from any component.
 *
 * Must be rendered inside `<AnalyticsProvider>`.
 * Returns `null` outside the provider (e.g. auth pages) — callers should
 * guard accordingly or use `useTrack()` for a safe no-op wrapper.
 */
export function useAnalyticsContext(): AnalyticsContextValue | null {
  return useContext(AnalyticsContext);
}

/**
 * Convenience hook that returns a `track` function which is a no-op
 * when called outside `<AnalyticsProvider>`.
 */
export function useTrack(): TrackFn {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    // Return a no-op so callers don't need to null-check
    return () => {};
  }
  return ctx.track;
}
