import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CommentItem } from './comment-item';
import { http, HttpResponse, delay } from 'msw';
import type { CommentType } from '@repo/rest-contracts';

const meta = {
  title: 'Components/CommentItem',
  component: CommentItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[700px] bg-background text-foreground p-6 border rounded-lg">
        <Story />
      </div>
    ),
  ],
  args: {
    onReply: fn(),
  },
} satisfies Meta<typeof CommentItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockComment: CommentType = {
  id: 'comment-1',
  postId: 'post-1',
  authorId: 'user-2',
  parentId: null,
  content: 'This is a great post! Thanks for sharing.',
  createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  author: {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    username: 'bobsmith',
  },
};

const mockOwnComment: CommentType = {
  ...mockComment,
  id: 'comment-2',
  authorId: 'user-1',
  content: 'I agree with this sentiment! Very well written.',
  createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  updatedAt: new Date(Date.now() - 600000).toISOString(),
  author: {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    username: 'janedoe',
  },
};

export const Default: Story = {
  args: {
    comment: mockComment,
    postId: 'post-1',
  },
  parameters: {
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
};

export const OwnedByCurrentUser: Story = {
  args: {
    comment: mockOwnComment,
    postId: 'post-1',
  },
  parameters: {
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
        http.delete('*/comments/:id', async () => {
          await delay(1000); // Simulate network delay
          return HttpResponse.json({
            ...mockOwnComment,
            deletedAt: new Date().toISOString(),
          });
        }),
      ],
    },
  },
};

export const WithIndentation: Story = {
  args: {
    comment: {
      ...mockComment,
      content: 'This is a nested reply at depth level 2',
    },
    postId: 'post-1',
    level: 2,
  },
  parameters: {
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
};

export const LongContent: Story = {
  args: {
    comment: {
      ...mockComment,
      content: `This is a much longer comment that spans multiple lines. It contains a lot of text to test how the comment wrapping works.

I wanted to discuss several points:

1. The implementation is really solid
2. The design is clean and modern
3. The performance seems great

Let me know what you think about these observations!`,
    },
    postId: 'post-1',
  },
  parameters: {
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
};

export const RecentComment: Story = {
  args: {
    comment: {
      ...mockComment,
      content: 'Just posted this comment!',
      createdAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      updatedAt: new Date(Date.now() - 30000).toISOString(),
    },
    postId: 'post-1',
  },
  parameters: {
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
};

export const DeepNesting: Story = {
  args: {
    comment: {
      ...mockComment,
      content: 'This is at depth 5 (maximum indentation)',
    },
    postId: 'post-1',
    level: 5,
  },
  parameters: {
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
};
