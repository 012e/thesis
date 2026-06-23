import {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const MIN_IDLE_DELAY_MS = 5_000;
const MAX_IDLE_DELAY_MS = 11_000;

type MascotProps = ComponentPropsWithoutRef<"span"> & {
  animateOccasionally?: boolean;
  label?: string;
  playKey?: number | string;
};

function getIdleDelay() {
  return (
    MIN_IDLE_DELAY_MS +
    Math.random() * (MAX_IDLE_DELAY_MS - MIN_IDLE_DELAY_MS)
  );
}

export function Mascot({
  animateOccasionally = true,
  className,
  label,
  playKey,
  ...props
}: MascotProps) {
  const [animationRun, setAnimationRun] = useState(0);
  const previousPlayKey = useRef(playKey);

  useEffect(() => {
    if (!animateOccasionally) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleAnimation = () => {
      timeoutId = setTimeout(() => {
        setAnimationRun((run) => run + 1);
        scheduleAnimation();
      }, getIdleDelay());
    };

    scheduleAnimation();

    return () => clearTimeout(timeoutId);
  }, [animateOccasionally]);

  useEffect(() => {
    if (Object.is(previousPlayKey.current, playKey)) return;

    previousPlayKey.current = playKey;
    setAnimationRun((run) => run + 1);
  }, [playKey]);

  return (
    <span
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("inline-flex size-9", className)}
    >
      <span
        key={animationRun}
        aria-hidden="true"
        className={cn(
          "mascot-sprite",
          animationRun > 0 && "mascot-sprite-playing",
        )}
      />
    </span>
  );
}
