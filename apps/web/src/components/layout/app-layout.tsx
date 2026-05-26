import { useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import { ChatManager } from "@/components/chat";
import { GlobalChatPanel } from "@/components/assistant-ui/global-chat-panel";
import { GlobalChatToggleButton } from "@/components/assistant-ui/global-chat-toggle-button";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MobileSidebarDrawer />
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[17.1875rem_minmax(0,1fr)]">
        <div className="hidden min-w-0 lg:block">
          <LeftSidebar />
        </div>
        <div className="min-w-0">
          <MainContent>{children}</MainContent>
        </div>
      </div>
      <ChatManager />
      <GlobalChatToggleButton />
      <GlobalChatPanel />
    </div>
  );
}

export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MobileSidebarDrawer />
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[17.1875rem_minmax(0,1fr)] xl:grid-cols-[17.1875rem_minmax(0,1fr)_21.875rem]">
        <div className="hidden min-w-0 lg:block">
          <LeftSidebar />
        </div>
        <div className="min-w-0">
          <MainContent>{children}</MainContent>
        </div>
        <div className="hidden min-w-0 xl:block">
          <RightSidebar />
        </div>
      </div>
      <ChatManager />
      <GlobalChatToggleButton />
      <GlobalChatPanel />
    </div>
  );
}

function MobileSidebarDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="fixed left-3 top-3 z-40 bg-background/95 backdrop-blur lg:hidden"
          aria-label="Open navigation"
        >
          <IconMenu2 />
          <span className="sr-only">Open navigation</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-0 data-[vaul-drawer-direction=left]:w-[17.1875rem] data-[vaul-drawer-direction=left]:max-w-[calc(100vw-2rem)]">
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <LeftSidebar onNavigate={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
