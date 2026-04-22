import { useAtom } from "jotai";
import { useEffect } from "react";
import themeAtom from "@/lib/atoms/theme";

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme, resolvedTheme: theme };
}
