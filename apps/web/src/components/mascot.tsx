import {
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const MIN_IDLE_DELAY_MS = 5_000;
const MAX_IDLE_DELAY_MS = 11_000;

const MASCOT_ACTIVITIES = [
  "blink",
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
] as const;

export type MascotActivity = (typeof MASCOT_ACTIVITIES)[number];

type MascotProps = ComponentPropsWithoutRef<"span"> & {
  activity?: MascotActivity | "random";
  animateOccasionally?: boolean;
  label?: string;
  playKey?: number | string;
};

type AnimationState = {
  activity: MascotActivity;
  run: number;
};

function getIdleDelay() {
  return (
    MIN_IDLE_DELAY_MS +
    Math.random() * (MAX_IDLE_DELAY_MS - MIN_IDLE_DELAY_MS)
  );
}

function getNextActivity(previous?: MascotActivity): MascotActivity {
  const choices = MASCOT_ACTIVITIES.filter(
    (candidate) => candidate !== previous,
  );

  return choices[Math.floor(Math.random() * choices.length)] ?? "blink";
}

export function Mascot({
  activity = "random",
  animateOccasionally = false,
  className,
  label,
  playKey,
  ...props
}: MascotProps) {
  const [animation, setAnimation] = useState<AnimationState>({
    activity: activity === "random" ? "blink" : activity,
    run: 0,
  });
  const previousPlayKey = useRef(playKey);

  const playAnimation = useCallback(() => {
    setAnimation((previous) => ({
      activity:
        activity === "random"
          ? getNextActivity(previous.activity)
          : activity,
      run: previous.run + 1,
    }));
  }, [activity]);

  useEffect(() => {
    if (!animateOccasionally) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleAnimation = () => {
      timeoutId = setTimeout(() => {
        playAnimation();
        scheduleAnimation();
      }, getIdleDelay());
    };

    scheduleAnimation();

    return () => clearTimeout(timeoutId);
  }, [animateOccasionally, playAnimation]);

  useEffect(() => {
    if (Object.is(previousPlayKey.current, playKey)) return;

    previousPlayKey.current = playKey;
    playAnimation();
  }, [playAnimation, playKey]);

  return (
    <span
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("inline-flex size-9", className)}
    >
      <span
        key={animation.run}
        aria-hidden="true"
        className={cn(
          "mascot-sprite",
          `mascot-sprite-${animation.activity}`,
          animation.run > 0 && "mascot-sprite-playing",
        )}
      />
    </span>
  );
}
