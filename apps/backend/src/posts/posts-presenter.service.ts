import { Injectable } from "@nestjs/common";
import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";

import { UsersService } from "@/users/users.service";
import { TagsService } from "@/tags/tags.service";

import type { PostDtoRow } from "./posts.types";

@Injectable()
export class PostsPresenterService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
  ) {}

  toDto(row: PostDtoRow, userReactionType?: ReactionTypeDto | null): PostDto {
    const currentUserReaction = userReactionType ?? null;

    return {
      id: row.id,
      authorId: row.authorId,
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
        image: this.usersService.resolveAvatarUrl(row.author.image ?? null),
      },
      content: row.content,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      commentCount: row.commentCount,
      currentUserReaction,
      currentUserUpvoted: currentUserReaction === "upvote",
      currentUserDownvoted: currentUserReaction === "downvote",
      currentUserSubscribed: row.currentUserSubscribed ?? false,
      currentUserBookmarked: row.currentUserBookmarked ?? false,
      tags: [],
      acceptedCommentId: row.acceptedCommentId,
      solvedAt: row.solvedAt ? row.solvedAt.toISOString() : null,
      needsHelp: row.kind === "question" && row.solvedAt === null,
    };
  }

  async hydrateTags(dtos: PostDto[]): Promise<PostDto[]> {
    if (dtos.length === 0) return dtos;

    const tagsMap = await this.tagsService.getTagsForPosts(
      dtos.map((dto) => dto.id),
    );

    for (const dto of dtos) {
      dto.tags = tagsMap.get(dto.id) ?? [];
    }

    return dtos;
  }
}
