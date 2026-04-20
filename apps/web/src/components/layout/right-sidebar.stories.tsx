import type { Meta, StoryObj } from "@storybook/react";
import { RightSidebar } from "./right-sidebar";

const meta = {
  title: "Layout/RightSidebar",
  component: RightSidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="flex h-screen bg-background text-foreground justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RightSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    defaultCollapsed: false,
  },
};

export const Collapsed: Story = {
  args: {
    defaultCollapsed: true,
  },
};
