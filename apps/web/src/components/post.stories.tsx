import type { Meta, StoryObj } from '@storybook/react';
import { Post } from './post';
import { http, HttpResponse } from 'msw';

const meta = {
  title: 'Components/Post',
  component: Post,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px] border rounded-lg bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Post>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockPost = {
  id: 'post-1',
  authorId: 'user-1',
  content: {
    text: 'This is a test post with some **markdown**.\n\n- Item 1\n- Item 2',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  upvoteCount: 10,
  downvoteCount: 2,
  author: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const Default: Story = {
  args: {
    post: mockPost,
    initialReactionSummary: {
      upvotes: 10,
      downvotes: 2,
      userReaction: null,
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/posts/reactions', () => {
          return HttpResponse.json({ success: true });
        }),
      ],
    },
  },
};

export const WithImages: Story = {
  args: {
    post: {
      ...mockPost,
      content: {
        ...mockPost.content,
        images: [
          {
            key: 'img1',
            url: 'https://images.unsplash.com/photo-1506744626753-1fa44df14dd1?w=800&q=80',
          },
          {
            key: 'img2',
            url: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=800&q=80',
          },
        ],
      },
    },
  },
};

export const WithPoll: Story = {
  args: {
    post: {
      ...mockPost,
      content: {
        ...mockPost.content,
        poll: {
          question: 'What is your favorite framework?',
          options: [
            { id: 'opt1', text: 'React' },
            { id: 'opt2', text: 'Vue' },
            { id: 'opt3', text: 'Svelte' },
          ],
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/polls/*', () => {
          return HttpResponse.json({
            postId: 'post-1',
            options: [
              { id: 'opt1', text: 'React', votes: 42 },
              { id: 'opt2', text: 'Vue', votes: 12 },
              { id: 'opt3', text: 'Svelte', votes: 5 },
            ],
            totalVotes: 59,
            hasVoted: false,
            votedOptionId: null,
            endsAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }),
      ],
    },
  },
};

export const UserReacted: Story = {
  args: {
    post: mockPost,
    initialReactionSummary: {
      upvotes: 11,
      downvotes: 2,
      userReaction: 'upvote',
    },
  },
};
