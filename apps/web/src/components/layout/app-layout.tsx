import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex w-full">
        <LeftSidebar />
        <MainContent>{children}</MainContent>
      </div>
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
    </div>
  );
}
