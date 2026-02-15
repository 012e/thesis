export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 max-w-[600px] border-x">
      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
}
