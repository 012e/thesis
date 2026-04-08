import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CommentEditor } from './comment-editor';
import { http, HttpResponse } from 'msw';

const meta = {
  title: 'Components/CommentEditor',
  component: CommentEditor,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.get('*/auth/session', () => {
          return HttpResponse.json({
            user: {
              id: 'user-1',
              email: 'jane@example.com',
              name: 'Jane Doe',
              username: 'janedoe',
            },
            session: {
              id: 'session-1',
              userId: 'user-1',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            },
          });
        }),
      ],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[700px] bg-background text-foreground border rounded-lg">
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof CommentEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Default comment editor. Type a comment and click Post or press Ctrl+Enter. Check the Actions panel to see `onSubmit` called.',
      },
    },
  },
};

export const ReplyMode: Story = {
  args: {
    isReply: true,
    placeholder: 'Write a reply...',
    submitLabel: 'Reply',
    onCancel: fn(),
    autoFocus: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Comment editor in reply mode with smaller avatar, auto-focus, and cancel button.',
      },
    },
  },
};

export const Submitting: Story = {
  args: {
    isPending: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Comment editor in a submitting/loading state. The button shows a spinner and inputs are disabled.',
      },
    },
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Share your thoughts on this post...',
    submitLabel: 'Share',
  },
};

export const ReplySubmitting: Story = {
  args: {
    isReply: true,
    placeholder: 'Write a reply...',
    submitLabel: 'Reply',
    isPending: true,
    onCancel: fn(),
  },
};
