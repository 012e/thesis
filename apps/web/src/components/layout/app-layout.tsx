import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center">
      <div className="flex w-full max-w-[1280px]">
        <LeftSidebar />
        <MainContent>{children}</MainContent>
        <RightSidebar />
      </div>
    </div>
  );
}
