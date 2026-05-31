import { Injectable } from "@nestjs/common";
import type {
  BookmarkSummaryDto,
  NotificationPayloadDto,
  NotificationTypeDto,
  PostDto,
  PostSubscriptionDto,
  ReactionTypeDto,
} from "@repo/shared-dto";

import { PostsEngagementService } from "./posts-engagement.service";
import { PostsMutationService } from "./posts-mutation.service";
import { PostsNotificationsService } from "./posts-notifications.service";
import { PostsPresenterService } from "./posts-presenter.service";
import { PostsReadService } from "./posts-read.service";
import type {
  CreatePostInput,
  PostDtoRow,
  PostFeedPage,
  UpdatePostInput,
} from "./posts.types";

@Injectable()
export class PostsService {
  constructor(
    private readonly postsReadService: PostsReadService,
    private readonly postsMutationService: PostsMutationService,
    private readonly postsEngagementService: PostsEngagementService,
    private readonly postsNotificationsService: PostsNotificationsService,
    private readonly postsPresenter: PostsPresenterService,
  ) {}

  listByUser(
    authorId: string,
    requestingUserId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    return this.postsReadService.listByUser(
      authorId,
      requestingUserId,
      limit,
      cursor,
    );
  }

  list(userId: string): Promise<PostDto[]> {
    return this.postsReadService.list(userId);
  }

  listByFollowing(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    return this.postsReadService.listByFollowing(userId, limit, cursor);
  }

  create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    return this.postsMutationService.create(authorId, input);
  }

  getById(id: string, userId?: string): Promise<PostDto | null> {
    return this.postsReadService.getById(id, userId);
  }

  update(
    id: string,
    authorId: string,
    input: UpdatePostInput,
  ): Promise<PostDto | null> {
    return this.postsMutationService.update(id, authorId, input);
  }

  recommendations(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    return this.postsReadService.recommendations(userId, limit, cursor);
  }

  delete(id: string, authorId: string): Promise<PostDto | null> {
    return this.postsMutationService.delete(id, authorId);
  }

  subscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    return this.postsEngagementService.subscribe(postId, userId);
  }

  unsubscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    return this.postsEngagementService.unsubscribe(postId, userId);
  }

  bookmark(postId: string, userId: string): Promise<BookmarkSummaryDto | null> {
    return this.postsEngagementService.bookmark(postId, userId);
  }

  unbookmark(
    postId: string,
    userId: string,
  ): Promise<BookmarkSummaryDto | null> {
    return this.postsEngagementService.unbookmark(postId, userId);
  }

  listBookmarks(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    return this.postsReadService.listBookmarks(userId, limit, cursor);
  }

  notifySubscribers(
    postId: string,
    actorId: string,
    type: NotificationTypeDto,
    payload: NotificationPayloadDto,
    excludeUserIds: string[] = [],
  ): Promise<void> {
    return this.postsNotificationsService.notifySubscribers(
      postId,
      actorId,
      type,
      payload,
      excludeUserIds,
    );
  }

  toDto(
    row: PostDtoRow,
    userReactionType?: ReactionTypeDto | null,
  ): PostDto {
    return this.postsPresenter.toDto(row, userReactionType);
  }

  hydrateTags(dtos: PostDto[]): Promise<PostDto[]> {
    return this.postsPresenter.hydrateTags(dtos);
  }
}
