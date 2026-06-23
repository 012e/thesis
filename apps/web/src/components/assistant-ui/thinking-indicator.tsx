import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconRobot } from "@tabler/icons-react";

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
  className,
}: ThinkingIndicatorProps) {
  // Randomize the starting phrase so consecutive turns don't always begin
  // with "Thinking".
  const initialIndex = useMemo(
    () => Math.floor(Math.random() * phrases.length),
    [phrases],
  );
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, interval);
    return () => clearInterval(id);
  }, [phrases.length, interval]);

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
        <IconRobot className="size-4" />
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
