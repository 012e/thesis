import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { queryClient } from "@/lib/query-client";
import { Provider as JotaiProvider } from "jotai";
import store from "@/lib/atoms/store";
import { ChatRuntimeProvider } from "./assistant-ui/chat-runtime-provider";
import { TooltipProvider } from "./ui/tooltip";
import { AnalyticsProvider } from "./analytics-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={1}>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider store={store}>
          <AnalyticsProvider>
            <ChatRuntimeProvider>{children}</ChatRuntimeProvider>
          </AnalyticsProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </TooltipProvider>
  );
}
