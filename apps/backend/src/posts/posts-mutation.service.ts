import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";
import { and, eq } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { postReactions, posts, postSubscriptions, usersView } from "@/db/schema";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";
import { ContentHashService } from "@/moderation/content-hash.service";
import { ModerationPipelineService } from "@/moderation/moderation-pipeline.service";
import { StorageService } from "@/storage/storage.service";
import { TagsService } from "@/tags/tags.service";

import {
  commentCount,
  downvoteCount,
  getCurrentUserBookmarked,
  getCurrentUserSubscribed,
  getUserReactionType,
  upvoteCount,
} from "./posts-query.helpers";
import { PostsNotificationsService } from "./posts-notifications.service";
import { PostsPresenterService } from "./posts-presenter.service";
import type { CreatePostInput, UpdatePostInput } from "./posts.types";

@Injectable()
export class PostsMutationService {
  private readonly logger = new Logger(PostsMutationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly postsPresenter: PostsPresenterService,
    private readonly postsNotificationsService: PostsNotificationsService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
    private readonly moderationPipelineService: ModerationPipelineService,
    private readonly contentHashService: ContentHashService,
    private readonly tagsService: TagsService,
  ) {}

  async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    const textToEmbed = input.content.text ?? "";
    const embedding = textToEmbed.trim()
      ? await this.embeddingService.embed(textToEmbed)
      : null;

    const [createdPost] = await this.databaseService.db
      .insert(posts)
      .values({
        authorId,
        content: input.content,
        embedding: embedding ?? null,
        contentHash: this.contentHashService.hash(textToEmbed) ?? null,
      })
      .returning();

    await this.databaseService.db
      .insert(postSubscriptions)
      .values({ postId: createdPost.id, userId: authorId })
      .onConflictDoNothing();

    const postTagDtos = await this.tagsService.syncPostTags(
      createdPost.id,
      authorId,
      input.content.text,
    );

    this.moderationPipelineService
      .runPipeline(createdPost.id, input.content.text ?? null)
      .catch((err: unknown) =>
        this.logger.error(
          `Moderation pipeline failed for post ${createdPost.id}: ${err}`,
        ),
      );

    const row = await this.getDtoRow(createdPost.id, authorId);
    if (!row) {
      throw new InternalServerErrorException(
        `Created post ${createdPost.id} could not be loaded`,
      );
    }

    const dto = this.postsPresenter.toDto(
      row,
      row.userReactionType as ReactionTypeDto | null,
    );
    dto.tags = postTagDtos;
    return dto;
  }

  async update(
    id: string,
    authorId: string,
    input: UpdatePostInput,
  ): Promise<PostDto | null> {
    const [updatedPost] = await this.databaseService.db
      .update(posts)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();

    if (!updatedPost) return null;

    const postTagDtos = await this.tagsService.syncPostTags(
      id,
      authorId,
      input.content.text,
    );

    const row = await this.getDtoRow(updatedPost.id, authorId);
    const dto = row
      ? this.postsPresenter.toDto(
          row,
          row.userReactionType as ReactionTypeDto | null,
        )
      : null;

    if (dto) {
      dto.tags = postTagDtos;
      void this.postsNotificationsService
        .deliverPostUpdateNotification(dto.id, authorId, dto.content.text)
        .catch((error: unknown) =>
          this.logger.warn(
            `Failed to notify subscribers for post update ${dto.id}: ${(error as Error).message}`,
          ),
        );
    }

    return dto;
  }

  async delete(id: string, authorId: string): Promise<PostDto | null> {
    const row = await this.getDtoRow(id, authorId);
    if (!row || row.authorId !== authorId) return null;

    await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));

    const images = row.content.images;
    if (images && images.length > 0) {
      const imageKeys = images.map((img) => img.key);
      this.storageService.deleteImages(imageKeys).catch((error: unknown) => {
        this.logger.error(`Failed to delete images for post ${id}:`, error);
      });
    }

    return this.postsPresenter.toDto(
      row,
      row.userReactionType as ReactionTypeDto | null,
    );
  }

  private async getDtoRow(id: string, userId: string) {
    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: getUserReactionType(userId),
        currentUserSubscribed: getCurrentUserSubscribed(userId),
        currentUserBookmarked: getCurrentUserBookmarked(userId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.id, id))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    return row ?? null;
  }
}
