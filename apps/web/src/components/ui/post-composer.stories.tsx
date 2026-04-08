import type { Meta, StoryObj } from '@storybook/react';
import { PostComposer } from './post-composer';
import { http, HttpResponse } from 'msw';

const meta = {
  title: 'Components/PostComposer',
  component: PostComposer,
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
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock better-auth session endpoint
const mockSession = {
  session: {
    id: 'sess-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    ipAddress: '127.0.0.1',
    userAgent: 'Storybook',
  },
  user: {
    id: 'user-1',
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    username: 'testuser',
  },
};

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/auth/session', () => {
          return HttpResponse.json(mockSession);
        }),
        http.post('*/api/posts', async ({ request }) => {
          return HttpResponse.json({ success: true });
        }),
      ],
    },
  },
};

export const WithImagesAndPolls: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/auth/session', () => {
          return HttpResponse.json(mockSession);
        }),
        http.post('*/api/posts', async () => {
          return HttpResponse.json({ success: true });
        }),
        http.post('*/api/posts/images', async () => {
          return HttpResponse.json({
            images: [
              {
                key: 'img1',
                url: 'https://images.unsplash.com/photo-1506744626753-1fa44df14dd1?w=800&q=80',
              },
            ],
          });
        }),
      ],
    },
  },
};
