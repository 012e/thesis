export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 max-w-none border-x">
      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
}
