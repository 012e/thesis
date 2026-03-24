import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { queryClient } from "@/lib/query-client";
import { Provider as JotaiProvider } from "jotai";
import store from "@/lib/atoms/store";
import { TooltipProvider } from "./ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider store={store}>{children}</JotaiProvider>
      </QueryClientProvider>
    </TooltipProvider>
  );
}
