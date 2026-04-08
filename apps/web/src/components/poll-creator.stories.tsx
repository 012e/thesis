import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PollCreator } from './poll-creator';

const meta = {
  title: 'Components/PollCreator',
  component: PollCreator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px] bg-background text-foreground p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    onPollChange: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof PollCreator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InteractiveExample: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Try creating a poll! Type a question and fill in at least 2 options. Watch the Actions panel to see `onPollChange` events.',
      },
    },
  },
};
