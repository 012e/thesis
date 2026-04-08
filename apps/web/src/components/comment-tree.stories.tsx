import type { Meta, StoryObj } from '@storybook/react';
import { CommentTree } from './comment-tree';
import { http, HttpResponse, delay } from 'msw';
import type { CommentType } from '@repo/rest-contracts';

const meta = {
  title: 'Components/CommentTree',
  component: CommentTree,
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
      <div className="w-[800px] bg-background text-foreground p-6 border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommentTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockComments: CommentType[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-2',
    parentId: null,
    content: 'This is a great post! Really insightful.',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    author: {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob Smith',
      username: 'bobsmith',
    },
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    authorId: 'user-3',
    parentId: null,
    content: 'I have a question about the implementation.',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    author: {
      id: 'user-3',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      username: 'alicej',
    },
  },
  {
    id: 'comment-3',
    postId: 'post-1',
    authorId: 'user-1',
    parentId: 'comment-2',
    content: 'Happy to help! What would you like to know?',
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    author: {
      id: 'user-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      username: 'janedoe',
    },
  },
  {
    id: 'comment-4',
    postId: 'post-1',
    authorId: 'user-3',
    parentId: 'comment-3',
    content: 'How does the error handling work in this scenario?',
    createdAt: new Date(Date.now() - 900000).toISOString(), // 15 min ago
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    author: {
      id: 'user-3',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      username: 'alicej',
    },
  },
];

const deeplyNestedComments: CommentType[] = [
  {
    id: 'comment-1',
    postId: 'post-2',
    authorId: 'user-1',
    parentId: null,
    content: 'Starting a discussion here.',
    createdAt: new Date(Date.now() - 10000000).toISOString(),
    updatedAt: new Date(Date.now() - 10000000).toISOString(),
    author: {
      id: 'user-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      username: 'janedoe',
    },
  },
  {
    id: 'comment-2',
    postId: 'post-2',
    authorId: 'user-2',
    parentId: 'comment-1',
    content: 'First level reply',
    createdAt: new Date(Date.now() - 9000000).toISOString(),
    updatedAt: new Date(Date.now() - 9000000).toISOString(),
    author: {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob Smith',
      username: 'bobsmith',
    },
  },
  {
    id: 'comment-3',
    postId: 'post-2',
    authorId: 'user-3',
    parentId: 'comment-2',
    content: 'Second level reply',
    createdAt: new Date(Date.now() - 8000000).toISOString(),
    updatedAt: new Date(Date.now() - 8000000).toISOString(),
    author: {
      id: 'user-3',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      username: 'alicej',
    },
  },
  {
    id: 'comment-4',
    postId: 'post-2',
    authorId: 'user-1',
    parentId: 'comment-3',
    content: 'Third level reply',
    createdAt: new Date(Date.now() - 7000000).toISOString(),
    updatedAt: new Date(Date.now() - 7000000).toISOString(),
    author: {
      id: 'user-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      username: 'janedoe',
    },
  },
  {
    id: 'comment-5',
    postId: 'post-2',
    authorId: 'user-2',
    parentId: 'comment-4',
    content: 'Fourth level reply',
    createdAt: new Date(Date.now() - 6000000).toISOString(),
    updatedAt: new Date(Date.now() - 6000000).toISOString(),
    author: {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob Smith',
      username: 'bobsmith',
    },
  },
  {
    id: 'comment-6',
    postId: 'post-2',
    authorId: 'user-3',
    parentId: 'comment-5',
    content: 'Fifth level reply (maximum indentation)',
    createdAt: new Date(Date.now() - 5000000).toISOString(),
    updatedAt: new Date(Date.now() - 5000000).toISOString(),
    author: {
      id: 'user-3',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      username: 'alicej',
    },
  },
];

export const Default: Story = {
  args: {
    comments: mockComments,
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
        http.post('*/comments/:id/replies', async ({ request, params }) => {
          await delay(500);
          const body = (await request.json()) as { content: string };
          return HttpResponse.json(
            {
              id: `comment-${Date.now()}`,
              postId: 'post-1',
              authorId: 'user-1',
              parentId: params.id as string,
              content: body.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: {
                id: 'user-1',
                email: 'jane@example.com',
                name: 'Jane Doe',
                username: 'janedoe',
              },
            },
            { status: 201 },
          );
        }),
        http.delete('*/comments/:id', async () => {
          await delay(500);
          return HttpResponse.json(
            {
              id: 'comment-3',
              postId: 'post-1',
              authorId: 'user-1',
              parentId: 'comment-2',
              content: 'Happy to help! What would you like to know?',
              createdAt: new Date(Date.now() - 1800000).toISOString(),
              updatedAt: new Date(Date.now() - 1800000).toISOString(),
              author: {
                id: 'user-1',
                email: 'jane@example.com',
                name: 'Jane Doe',
                username: 'janedoe',
              },
            },
            { status: 200 },
          );
        }),
      ],
    },
  },
};

export const EmptyState: Story = {
  args: {
    comments: [],
    postId: 'post-1',
  },
};

export const DeeplyNested: Story = {
  args: {
    comments: deeplyNestedComments,
    postId: 'post-2',
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
        http.post('*/comments/:id/replies', async ({ request, params }) => {
          await delay(500);
          const body = (await request.json()) as { content: string };
          return HttpResponse.json(
            {
              id: `comment-${Date.now()}`,
              postId: 'post-2',
              authorId: 'user-1',
              parentId: params.id as string,
              content: body.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: {
                id: 'user-1',
                email: 'jane@example.com',
                name: 'Jane Doe',
                username: 'janedoe',
              },
            },
            { status: 201 },
          );
        }),
      ],
    },
  },
};

export const SingleThread: Story = {
  args: {
    comments: [mockComments[0]],
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
        http.post('*/comments/:id/replies', async ({ request, params }) => {
          await delay(500);
          const body = (await request.json()) as { content: string };
          return HttpResponse.json(
            {
              id: `comment-${Date.now()}`,
              postId: 'post-1',
              authorId: 'user-1',
              parentId: params.id as string,
              content: body.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: {
                id: 'user-1',
                email: 'jane@example.com',
                name: 'Jane Doe',
                username: 'janedoe',
              },
            },
            { status: 201 },
          );
        }),
      ],
    },
  },
};
