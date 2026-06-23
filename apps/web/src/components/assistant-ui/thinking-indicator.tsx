import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconCheck } from "@tabler/icons-react";

import { Mascot } from "@/components/mascot";
import { cn } from "@/lib/utils";

const DEFAULT_PHRASES = [
  "Thinking",
  "Pondering",
  "Cooking",
  "Processing",
  "Reasoning",
  "Crunching",
  "Brewing",
  "Mulling it over",
  "Connecting dots",
  "Synthesizing",
  "Untangling",
  "Working on it",
];

interface ThinkingIndicatorProps {
  /** Override the rotating phrases. */
  phrases?: string[];
  /** Milliseconds each phrase stays on screen. */
  interval?: number;
  /** Only appear once the stream has been running this many ms. */
  delay?: number;
  className?: string;
}

/**
 * Animated "is thinking" indicator inspired by Claude Code's status line:
 * a gently bobbing mascot, a shimmering label that rotates through playful
 * verbs, and pulsing trailing dots. Motion is short and functional, matching
 * the product's dense JetBrains-Mono aesthetic.
 */
export function ThinkingIndicator({
  phrases = DEFAULT_PHRASES,
  interval = 4500,
  delay = 5000,
  className,
}: ThinkingIndicatorProps) {
  // Randomize the starting phrase so consecutive turns don't always begin
  // with "Thinking".
  const initialIndex = useMemo(
    () => Math.floor(Math.random() * phrases.length),
    [phrases],
  );
  const [index, setIndex] = useState(initialIndex);

  // The component is mounted for the whole stream, but stays hidden until the
  // stream has been running for `delay` ms — so quick responses never flash it.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, interval);
    return () => clearInterval(id);
  }, [visible, phrases.length, interval]);

  if (!visible) return null;

  const phrase = phrases[index] ?? phrases[0] ?? "Thinking";

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground select-none",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`${phrase}…`}
    >
      <motion.span
        className="text-primary"
        animate={{ y: [0, -2.5, 0], rotate: [0, -6, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Mascot animateOccasionally className="size-5" />
      </motion.span>

      <span className="flex items-baseline">
        <span className="relative inline-flex h-[1.25em] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={phrase}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-r from-primary via-foreground to-primary bg-[length:200%_100%] bg-clip-text font-medium text-transparent [animation:thinking-shimmer_2.4s_linear_infinite]"
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </span>
        <ThinkingDots />
      </span>
    </div>
  );
}

/**
 * Format an elapsed duration as a human-readable "finished in" label. Seconds
 * are always shown; minutes are only included once the run took longer than
 * two minutes, keeping the common (short) case terse.
 */
function formatFinishedDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));

  if (totalSeconds > 120) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const minuteLabel = `${minutes} minute${minutes === 1 ? "" : "s"}`;
    const secondLabel = `${seconds} second${seconds === 1 ? "" : "s"}`;
    return `${minuteLabel} ${secondLabel}`;
  }

  return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
}

interface FinishedIndicatorProps {
  /** Elapsed run time in milliseconds. */
  durationMs: number;
  className?: string;
}

/**
 * Subtle "Finished in …" label shown once a response completes, mirroring the
 * muted, JetBrains-Mono metadata style used elsewhere in the thread.
 */
export function FinishedIndicator({
  durationMs,
  className,
}: FinishedIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground select-none",
        className,
      )}
      role="status"
    >
      <IconCheck className="size-3.5 text-primary" />
      <span>Finished in {formatFinishedDuration(durationMs)}</span>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex ml-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-primary"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
