import { useEffect, useRef, useState } from "react";

export function useThrottledValue<T>(value: T, waitMs: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastRunRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (elapsed >= waitMs) {
      lastRunRef.current = now;
      setThrottledValue(value);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      lastRunRef.current = Date.now();
      setThrottledValue(value);
      timeoutRef.current = null;
    }, waitMs - elapsed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, waitMs]);

  return throttledValue;
}
