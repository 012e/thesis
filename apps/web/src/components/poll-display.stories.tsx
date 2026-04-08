import type { Meta, StoryObj } from '@storybook/react';
import { PollDisplay } from './poll-display';
import { http, HttpResponse } from 'msw';

const meta = {
  title: 'Components/PollDisplay',
  component: PollDisplay,
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
} satisfies Meta<typeof PollDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockPoll = {
  question: 'What is your favorite JavaScript framework?',
  options: [
    { id: 'opt-1', label: 'React' },
    { id: 'opt-2', label: 'Vue' },
    { id: 'opt-3', label: 'Svelte' },
    { id: 'opt-4', label: 'Angular' },
  ],
  allowsMultipleSelections: false,
  closesAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
};

const mockPollMultiple = {
  question:
    'Which programming languages do you use regularly? (Select all that apply)',
  options: [
    { id: 'opt-1', label: 'TypeScript' },
    { id: 'opt-2', label: 'Python' },
    { id: 'opt-3', label: 'Go' },
    { id: 'opt-4', label: 'Rust' },
    { id: 'opt-5', label: 'Java' },
  ],
  allowsMultipleSelections: true,
  closesAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
};

export const Default: Story = {
  args: {
    postId: 'post-1',
    poll: mockPoll,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/posts/:id/poll', () => {
          return HttpResponse.json({
            postId: 'post-1',
            options: [
              { optionId: 'opt-1', voteCount: 42, percentage: 45 },
              { optionId: 'opt-2', voteCount: 28, percentage: 30 },
              { optionId: 'opt-3', voteCount: 15, percentage: 16 },
              { optionId: 'opt-4', voteCount: 8, percentage: 9 },
            ],
            totalVotes: 93,
            userVotes: [],
            isClosed: false,
          });
        }),
        http.post('*/posts/:id/poll/vote', async ({ request }) => {
          const body = (await request.json()) as { optionIds: string[] };
          return HttpResponse.json({
            postId: 'post-1',
            options: [
              { optionId: 'opt-1', voteCount: 43, percentage: 46 },
              { optionId: 'opt-2', voteCount: 28, percentage: 30 },
              { optionId: 'opt-3', voteCount: 15, percentage: 16 },
              { optionId: 'opt-4', voteCount: 8, percentage: 8 },
            ],
            totalVotes: 94,
            userVotes: body.optionIds || [],
            isClosed: false,
          });
        }),
        http.delete('*/posts/:id/poll/vote', () => {
          return HttpResponse.json({
            postId: 'post-1',
            options: [
              { optionId: 'opt-1', voteCount: 42, percentage: 45 },
              { optionId: 'opt-2', voteCount: 28, percentage: 30 },
              { optionId: 'opt-3', voteCount: 15, percentage: 16 },
              { optionId: 'opt-4', voteCount: 8, percentage: 9 },
            ],
            totalVotes: 93,
            userVotes: [],
            isClosed: false,
          });
        }),
      ],
    },
  },
};

export const UserHasVoted: Story = {
  args: {
    postId: 'post-2',
    poll: mockPoll,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/posts/:id/poll', () => {
          return HttpResponse.json({
            postId: 'post-2',
            options: [
              { optionId: 'opt-1', voteCount: 43, percentage: 46 },
              { optionId: 'opt-2', voteCount: 28, percentage: 30 },
              { optionId: 'opt-3', voteCount: 15, percentage: 16 },
              { optionId: 'opt-4', voteCount: 8, percentage: 8 },
            ],
            totalVotes: 94,
            userVotes: ['opt-1'],
            isClosed: false,
          });
        }),
        http.delete('*/posts/:id/poll/vote', () => {
          return HttpResponse.json({
            postId: 'post-2',
            options: [
              { optionId: 'opt-1', voteCount: 42, percentage: 45 },
              { optionId: 'opt-2', voteCount: 28, percentage: 30 },
              { optionId: 'opt-3', voteCount: 15, percentage: 16 },
              { optionId: 'opt-4', voteCount: 8, percentage: 9 },
            ],
            totalVotes: 93,
            userVotes: [],
            isClosed: false,
          });
        }),
      ],
    },
  },
};

export const MultipleSelection: Story = {
  args: {
    postId: 'post-3',
    poll: mockPollMultiple,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/posts/:id/poll', () => {
          return HttpResponse.json({
            postId: 'post-3',
            options: [
              { optionId: 'opt-1', voteCount: 85, percentage: 68 },
              { optionId: 'opt-2', voteCount: 62, percentage: 50 },
              { optionId: 'opt-3', voteCount: 35, percentage: 28 },
              { optionId: 'opt-4', voteCount: 28, percentage: 22 },
              { optionId: 'opt-5', voteCount: 45, percentage: 36 },
            ],
            totalVotes: 125,
            userVotes: [],
            isClosed: false,
          });
        }),
        http.post('*/posts/:id/poll/vote', async ({ request }) => {
          const body = (await request.json()) as { optionIds: string[] };
          return HttpResponse.json({
            postId: 'post-3',
            options: [
              { optionId: 'opt-1', voteCount: 86, percentage: 68 },
              { optionId: 'opt-2', voteCount: 63, percentage: 50 },
              { optionId: 'opt-3', voteCount: 35, percentage: 28 },
              { optionId: 'opt-4', voteCount: 28, percentage: 22 },
              { optionId: 'opt-5', voteCount: 45, percentage: 36 },
            ],
            totalVotes: 126,
            userVotes: body.optionIds || [],
            isClosed: false,
          });
        }),
      ],
    },
  },
};

export const PollClosed: Story = {
  args: {
    postId: 'post-4',
    poll: {
      ...mockPoll,
      closesAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/posts/:id/poll', () => {
          return HttpResponse.json({
            postId: 'post-4',
            options: [
              { optionId: 'opt-1', voteCount: 150, percentage: 48 },
              { optionId: 'opt-2', voteCount: 95, percentage: 30 },
              { optionId: 'opt-3', voteCount: 42, percentage: 13 },
              { optionId: 'opt-4', voteCount: 28, percentage: 9 },
            ],
            totalVotes: 315,
            userVotes: [],
            isClosed: true,
          });
        }),
      ],
    },
  },
};

export const NoPollDuration: Story = {
  args: {
    postId: 'post-5',
    poll: {
      ...mockPoll,
      closesAt: null,
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/posts/:id/poll', () => {
          return HttpResponse.json({
            postId: 'post-5',
            options: [
              { optionId: 'opt-1', voteCount: 12, percentage: 40 },
              { optionId: 'opt-2', voteCount: 9, percentage: 30 },
              { optionId: 'opt-3', voteCount: 6, percentage: 20 },
              { optionId: 'opt-4', voteCount: 3, percentage: 10 },
            ],
            totalVotes: 30,
            userVotes: [],
            isClosed: false,
          });
        }),
        http.post('*/posts/:id/poll/vote', async ({ request }) => {
          const body = (await request.json()) as { optionIds: string[] };
          return HttpResponse.json({
            postId: 'post-5',
            options: [
              { optionId: 'opt-1', voteCount: 13, percentage: 42 },
              { optionId: 'opt-2', voteCount: 9, percentage: 29 },
              { optionId: 'opt-3', voteCount: 6, percentage: 19 },
              { optionId: 'opt-4', voteCount: 3, percentage: 10 },
            ],
            totalVotes: 31,
            userVotes: body.optionIds || [],
            isClosed: false,
          });
        }),
      ],
    },
  },
};
