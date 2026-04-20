import { RightSidebar } from "./right-sidebar";
const meta = {
    title: "Layout/RightSidebar",
    component: RightSidebar,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (<div className="flex h-screen bg-background text-foreground justify-end">
        <Story />
      </div>),
    ],
};
export default meta;
export const Expanded = {
    args: {
        defaultCollapsed: false,
    },
};
export const Collapsed = {
    args: {
        defaultCollapsed: true,
    },
};
