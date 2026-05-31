import { useMemo } from "react";
import {
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { z } from "zod";
import {
  ASSISTANT_PAGE_DEFINITIONS,
  ASSISTANT_PAGE_IDS,
  getAssistantPageByPathname,
  getAssistantPageDefinition,
  type AssistantPageId,
} from "@/lib/assistant/page-capabilities";
import {
  isAssistantPageReady,
  waitForAssistantPageReady,
} from "@/lib/assistant/page-readiness";

const NavigateToPageInput = z.object({
  page: z.enum(ASSISTANT_PAGE_IDS),
});

const EmptyInput = z.object({});

const PAGE_CATALOG = ASSISTANT_PAGE_DEFINITIONS.map((page) => ({
  page: page.id,
  label: page.label,
  path: page.path,
  aliases: page.aliases,
  description: page.description,
  localToolsAfterNavigation: page.assistantTools.map((tool) => tool.toolName),
}));

export function AppNavigationAssistantTools() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) {
    return null;
  }

  return <AppNavigationAssistantToolsInner pathname={pathname} />;
}

function AppNavigationAssistantToolsInner({ pathname }: { pathname: string }) {
  const router = useRouter();
  const currentPage = getAssistantPageByPathname(pathname);

  useAssistantInstructions(
    `You can navigate the application with the navigate_to_page tool. Available pages: ${JSON.stringify(PAGE_CATALOG)}. Frontend tools are collected per request, not during an already-running step. If a user asks you to work with page-specific UI that is not currently mounted, first call navigate_to_page and wait for it to return assistantToolsReady: true. Then continue in the next step using the page-local tools exposed by that page. Never navigate to arbitrary URLs; only use the listed pages. Current app page: ${currentPage?.label ?? "Unknown"} (${pathname}).`,
  );

  const navigateToPageTool = useMemo(
    () => ({
      toolName: "navigate_to_page",
      description:
        "Navigate the user to an allowlisted application page. Use this before calling page-specific UI tools that only exist when their page is mounted.",
      parameters: NavigateToPageInput,
      execute: async ({ page }: z.infer<typeof NavigateToPageInput>) => {
        const definition = getAssistantPageDefinition(page);
        if (!definition) {
          return {
            status: "not_found",
            page,
            message: "Unknown application page.",
          };
        }

        await navigateToPage(router, page);

        const assistantToolsReady = definition.requiresAssistantReady
          ? await waitForAssistantPageReady(page)
          : true;

        return {
          status: assistantToolsReady ? "success" : "not_ready",
          page: definition.id,
          label: definition.label,
          path: definition.path,
          assistantToolsReady,
          availableAfterNavigation: definition.assistantTools,
          message: assistantToolsReady
            ? "Navigation completed. Continue in the next step with the tools now available on this page."
            : "Navigation completed, but the page-specific assistant tools did not become ready before the timeout.",
        };
      },
    }),
    [router],
  );

  const getCurrentPageTool = useMemo(
    () => ({
      toolName: "get_current_page",
      description:
        "Return the current application page and any page-local assistant tools that should be available in this request.",
      parameters: EmptyInput,
      execute: () => {
        const page = getAssistantPageByPathname(window.location.pathname);
        if (!page) {
          return {
            status: "unknown",
            path: window.location.pathname,
            assistantToolsReady: false,
            availableTools: [],
          };
        }

        return {
          status: "success",
          page: page.id,
          label: page.label,
          path: page.path,
          assistantToolsReady: page.requiresAssistantReady
            ? isAssistantPageReady(page.id)
            : true,
          availableTools: page.assistantTools,
        };
      },
    }),
    [],
  );

  const listAppPagesTool = useMemo(
    () => ({
      toolName: "list_app_pages",
      description:
        "List pages the assistant is allowed to navigate to and the page-local tools expected after navigation.",
      parameters: EmptyInput,
      execute: () => ({
        status: "success",
        pages: PAGE_CATALOG,
      }),
    }),
    [],
  );

  useAssistantTool(navigateToPageTool);
  useAssistantTool(getCurrentPageTool);
  useAssistantTool(listAppPagesTool);

  return null;
}

async function navigateToPage(
  router: ReturnType<typeof useRouter>,
  page: AssistantPageId,
) {
  switch (page) {
    case "home":
      await router.navigate({ to: "/" });
      return;
    case "explore":
      await router.navigate({ to: "/explore" });
      return;
    case "bookmarks":
      await router.navigate({ to: "/bookmarks" });
      return;
    case "notifications":
      await router.navigate({ to: "/notifications" });
      return;
    case "settings":
      await router.navigate({ to: "/settings" });
      return;
    case "chat":
      await router.navigate({ to: "/chat" });
      return;
    case "playground":
      await router.navigate({ to: "/playground" });
      return;
  }
}
