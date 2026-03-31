import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { PollResultsDto } from '@repo/shared-dto';

import { DatabaseService } from '@/db/database.service';
import { pollVotes, posts } from '@/db/schema';
import type { VotePollInput } from './polls.schemas';

@Injectable()
export class PollsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async vote(
    postId: string,
    userId: string,
    input: VotePollInput,
  ): Promise<
    PollResultsDto | { error: string; code: 'NOT_FOUND' | 'INVALID' }
  > {
    // Get the post and verify it has a poll
    const [post] = await this.databaseService.db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return { error: 'Post not found', code: 'NOT_FOUND' };
    }

    if (!post.content.poll) {
      return { error: 'Post does not contain a poll', code: 'INVALID' };
    }

    const poll = post.content.poll;

    // Check if poll is closed
    if (poll.closesAt) {
      const closesAt = new Date(poll.closesAt);
      if (closesAt < new Date()) {
        return { error: 'Poll is closed', code: 'INVALID' };
      }
    }

    // Validate option IDs
    const validOptionIds = new Set(poll.options.map((o) => o.id));
    for (const optionId of input.optionIds) {
      if (!validOptionIds.has(optionId)) {
        return { error: `Invalid option ID: ${optionId}`, code: 'INVALID' };
      }
    }

    // Check if multiple selections are allowed
    if (!poll.allowsMultipleSelections && input.optionIds.length > 1) {
      return {
        error: 'This poll only allows single selection',
        code: 'INVALID',
      };
    }

    // Remove existing votes for this user on this post
    await this.databaseService.db
      .delete(pollVotes)
      .where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)));

    // Insert new votes
    if (input.optionIds.length > 0) {
      await this.databaseService.db.insert(pollVotes).values(
        input.optionIds.map((optionId) => ({
          postId,
          optionId,
          userId,
        })),
      );
    }

    return this.getResults(postId, userId);
  }

  async unvote(
    postId: string,
    userId: string,
  ): Promise<PollResultsDto | { error: string; code: 'NOT_FOUND' }> {
    // Verify post exists and has a poll
    const [post] = await this.databaseService.db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return { error: 'Post not found', code: 'NOT_FOUND' };
    }

    if (!post.content.poll) {
      return { error: 'Post does not contain a poll', code: 'NOT_FOUND' };
    }

    // Remove all votes for this user on this post
    await this.databaseService.db
      .delete(pollVotes)
      .where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)));

    return this.getResults(postId, userId);
  }

  async getResults(
    postId: string,
    userId?: string,
  ): Promise<PollResultsDto | { error: string; code: 'NOT_FOUND' }> {
    // Get the post and verify it has a poll
    const [post] = await this.databaseService.db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return { error: 'Post not found', code: 'NOT_FOUND' };
    }

    if (!post.content.poll) {
      return { error: 'Post does not contain a poll', code: 'NOT_FOUND' };
    }

    const poll = post.content.poll;

    // Get vote counts per option
    const voteCounts = await this.databaseService.db
      .select({
        optionId: pollVotes.optionId,
        count: sql<number>`count(DISTINCT ${pollVotes.userId})::int`,
      })
      .from(pollVotes)
      .where(eq(pollVotes.postId, postId))
      .groupBy(pollVotes.optionId);

    // Get total unique voters
    const [totalVotersRow] = await this.databaseService.db
      .select({
        total: sql<number>`count(DISTINCT ${pollVotes.userId})::int`,
      })
      .from(pollVotes)
      .where(eq(pollVotes.postId, postId));

    const totalVotes = totalVotersRow?.total ?? 0;

    // Get user's votes if userId provided
    let userVotes: string[] = [];
    if (userId) {
      const userVoteRows = await this.databaseService.db
        .select({ optionId: pollVotes.optionId })
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)));
      userVotes = userVoteRows.map((r) => r.optionId);
    }

    // Build vote count map
    const voteCountMap = new Map<string, number>();
    for (const vc of voteCounts) {
      voteCountMap.set(vc.optionId, vc.count);
    }

    // Check if poll is closed
    const isClosed = poll.closesAt
      ? new Date(poll.closesAt) < new Date()
      : false;

    // Build options with results
    const options = poll.options.map((option) => {
      const voteCount = voteCountMap.get(option.id) ?? 0;
      const percentage =
        totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

      return {
        optionId: option.id,
        label: option.label,
        voteCount,
        percentage,
      };
    });

    return {
      postId,
      totalVotes,
      options,
      userVotes,
      isClosed,
      closesAt: poll.closesAt ?? null,
    };
  }
}
