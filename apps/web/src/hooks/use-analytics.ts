import { useCallback, useEffect, useRef } from "react";
import { ingestAnalyticsEvents } from "@/lib/api/analytics";
import { env } from "@/env";
import type { AnalyticsEventInput } from "@repo/rest-contracts";

/** Default configuration for the analytics batcher. */
const BATCH_FLUSH_INTERVAL_MS = 5_000; // flush every 5 seconds
const BATCH_MAX_SIZE = 50; // flush when reaching 50 events

/**
 * React hook that provides analytics event tracking with automatic batching.
 *
 * Events are queued in memory and flushed to the server either:
 *  - When the queue reaches `maxBatchSize` events, or
 *  - Every `flushIntervalMs` milliseconds, or
 *  - When the page is being unloaded (beforeunload).
 *
 * Usage:
 * ```tsx
 * const { track } = useAnalytics();
 * track("post_view", { postId: "abc", dwellTimeMs: 3200 });
 * ```
 */
export function useAnalytics(options?: {
  flushIntervalMs?: number;
  maxBatchSize?: number;
}) {
  const flushIntervalMs = options?.flushIntervalMs ?? BATCH_FLUSH_INTERVAL_MS;
  const maxBatchSize = options?.maxBatchSize ?? BATCH_MAX_SIZE;

  const queueRef = useRef<AnalyticsEventInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Flush the current queue to the server. */
  const flush = useCallback(async () => {
    const events = queueRef.current.splice(0, queueRef.current.length);
    if (events.length === 0) return;

    try {
      await ingestAnalyticsEvents(events);
    } catch {
      // On failure, push events back to the front of the queue so they
      // can be retried on the next flush.
      queueRef.current.unshift(...events);
    }
  }, []);

  /** Track a single analytics event. */
  const track = useCallback(
    (
      type: AnalyticsEventInput["type"],
      metadata?: Record<string, unknown>,
    ) => {
      queueRef.current.push({
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });

      // Eagerly flush when the batch is full.
      if (queueRef.current.length >= maxBatchSize) {
        void flush();
      }
    },
    [maxBatchSize, flush],
  );

  // Set up periodic flush interval.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      void flush();
    }, flushIntervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Flush remaining events on unmount.
      void flush();
    };
  }, [flush, flushIntervalMs]);

  // Flush on page unload to avoid losing events.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const events = queueRef.current.splice(0, queueRef.current.length);
      if (events.length === 0) return;

      // Use sendBeacon for reliable delivery during page unload.
      const token = (() => {
        try {
          const raw = localStorage.getItem("bearer_token");
          if (!raw) return null;
          const parsed: unknown = JSON.parse(raw);
          return typeof parsed === "string" ? parsed : null;
        } catch {
          return null;
        }
      })();

      const blob = new Blob(
        [JSON.stringify({ events })],
        { type: "application/json" },
      );

      // sendBeacon doesn't support custom headers, so we append
      // the bearer token as a query parameter for beacon requests.
      const baseUrl = env.VITE_BACKEND_URL;
      const url = token
        ? `${baseUrl}/analytics/events?_token=${encodeURIComponent(token)}`
        : `${baseUrl}/analytics/events`;

      navigator.sendBeacon(url, blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return { track, flush };
}
