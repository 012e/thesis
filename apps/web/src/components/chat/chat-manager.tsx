import { DmSidebar } from "./dm-sidebar";
import { DmToggleButton } from "./dm-toggle-button";

/**
 * Root chat UI component. Mount once inside AppLayout.
 * Renders the DM sidebar panel and its floating toggle button.
 */
export function ChatManager() {
  return (
    <>
      <DmSidebar />
      <DmToggleButton />
    </>
  );
}
