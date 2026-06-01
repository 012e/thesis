export type AssistantPageId =
  | "home"
  | "explore"
  | "bookmarks"
  | "notifications"
  | "settings"
  | "chat"
  | "playground";

export type AssistantPageCapability = {
  readonly toolName: string;
  readonly description: string;
};

export type AssistantPageDefinition = {
  readonly id: AssistantPageId;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly aliases: readonly string[];
  readonly assistantTools: readonly AssistantPageCapability[];
  readonly requiresAssistantReady: boolean;
};

export const ASSISTANT_PAGE_DEFINITIONS = [
  {
    id: "home",
    label: "Home Feed",
    path: "/",
    description: "Main recommended post feed.",
    aliases: ["home", "feed", "timeline"],
    assistantTools: [],
    requiresAssistantReady: false,
  },
  {
    id: "explore",
    label: "Explore",
    path: "/explore",
    description: "Search and explore posts, tags, and users.",
    aliases: ["explore", "search", "discover"],
    assistantTools: [],
    requiresAssistantReady: false,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    path: "/bookmarks",
    description: "User's bookmarked posts.",
    aliases: ["bookmarks", "saved"],
    assistantTools: [],
    requiresAssistantReady: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    path: "/notifications",
    description: "Notifications and recent account activity.",
    aliases: ["notifications", "activity"],
    assistantTools: [],
    requiresAssistantReady: false,
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    description: "Account and application settings.",
    aliases: ["settings", "preferences"],
    assistantTools: [],
    requiresAssistantReady: false,
  },
  {
    id: "chat",
    label: "Chat",
    path: "/chat",
    description: "Full-screen AI chat workspace.",
    aliases: ["chat", "assistant"],
    assistantTools: [
      {
        toolName: "open_form",
        description: "Open a supported UI form in the chat workspace.",
      },
      {
        toolName: "set_form_field",
        description: "Update fields in the active chat workspace form.",
      },
      {
        toolName: "submit_form",
        description:
          "Submit the active chat workspace form after confirmation.",
      },
    ],
    requiresAssistantReady: false,
  },
  {
    id: "playground",
    label: "Playground",
    path: "/playground",
    description: "Code playground with an editor and executable output panel.",
    aliases: ["playground", "code", "editor", "sandbox"],
    assistantTools: [
      {
        toolName: "read_file",
        description: "Read the current playground virtual file.",
      },
      {
        toolName: "edit_file",
        description: "Apply an exact replacement to the playground file.",
      },
      {
        toolName: "write_file",
        description: "Replace the full playground file.",
      },
      {
        toolName: "set_playground_language",
        description: "Switch the playground language.",
      },
      {
        toolName: "run_playground_code",
        description: "Execute the current playground code.",
      },
    ],
    requiresAssistantReady: true,
  },
] as const satisfies readonly AssistantPageDefinition[];

export const ASSISTANT_PAGE_IDS = ASSISTANT_PAGE_DEFINITIONS.map(
  (page) => page.id,
) as [AssistantPageId, ...AssistantPageId[]];

export function getAssistantPageDefinition(pageId: AssistantPageId) {
  return ASSISTANT_PAGE_DEFINITIONS.find((page) => page.id === pageId);
}

export function getAssistantPageByPathname(pathname: string) {
  if (pathname === "/") return getAssistantPageDefinition("home");
  if (pathname.startsWith("/explore"))
    return getAssistantPageDefinition("explore");
  if (pathname.startsWith("/bookmarks"))
    return getAssistantPageDefinition("bookmarks");
  if (pathname.startsWith("/notifications")) {
    return getAssistantPageDefinition("notifications");
  }
  if (pathname.startsWith("/settings"))
    return getAssistantPageDefinition("settings");
  if (pathname.startsWith("/chat")) return getAssistantPageDefinition("chat");
  if (pathname.startsWith("/playground")) {
    return getAssistantPageDefinition("playground");
  }

  return undefined;
}
