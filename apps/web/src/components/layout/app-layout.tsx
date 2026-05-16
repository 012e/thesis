import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";
import { ChatManager } from "@/components/chat";
import { GlobalChatPanel } from "@/components/assistant-ui/global-chat-panel";
import { GlobalChatToggleButton } from "@/components/assistant-ui/global-chat-toggle-button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex w-full">
        <LeftSidebar />
        <MainContent>{children}</MainContent>
      </div>
      <ChatManager />
      <GlobalChatToggleButton />
      <GlobalChatPanel />
    </div>
  );
}

export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex w-full">
        <LeftSidebar />
        <MainContent>{children}</MainContent>
        <RightSidebar />
      </div>
      <ChatManager />
      <GlobalChatToggleButton />
      <GlobalChatPanel />
    </div>
  );
}
