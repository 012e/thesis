import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { postsContract } from "@repo/rest-contracts";

import { PostsSearchService } from "./posts-search.service";
import { createPostSchema, updatePostSchema } from "./posts.schemas";
import { PostsService } from "./posts.service";

@Controller()
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsSearchService: PostsSearchService,
  ) {}

  @TsRestHandler(postsContract.listPosts)
  listPosts(@Session() session: UserSession) {
    return tsRestHandler(postsContract.listPosts, async () => {
      const posts = await this.postsService.list(session.user.id);

      return {
        status: 200,
        body: postsContract.listPosts.responses[200].parse(posts),
      };
    });
  }

  @TsRestHandler(postsContract.createPost)
  createPost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.createPost, async ({ body }) => {
      const input = createPostSchema.parse(body);
      const post = await this.postsService.create(session.user.id, input);

      return {
        status: 201,
        body: postsContract.createPost.responses[201].parse(post),
      };
    });
  }

  @TsRestHandler(postsContract.searchPosts)
  searchPosts(@Session() session: UserSession) {
    return tsRestHandler(postsContract.searchPosts, async ({ query }) => {
      const results = await this.postsSearchService.search(
        query.q,
        session.user.id,
      );

      return {
        status: 200,
        body: results as any,
      };
    });
  }

  @TsRestHandler(postsContract.listFollowingPosts)
  listFollowingPosts(@Session() session: UserSession) {
    return tsRestHandler(postsContract.listFollowingPosts, async ({ query }) => {
      const limit = query.limit ?? 20;
      const result = await this.postsService.listByFollowing(
        session.user.id,
        limit,
        query.cursor,
      );
      return {
        status: 200,
        body: postsContract.listFollowingPosts.responses[200].parse(result),
      };
    });
  }

  @TsRestHandler(postsContract.getPost)
  getPost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.getPost, async ({ params }) => {
      const post = await this.postsService.getById(params.id, session.user.id);

      if (!post) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: post as any,
      };
    });
  }

  @TsRestHandler(postsContract.updatePost)
  updatePost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.updatePost, async ({ params, body }) => {
      const input = updatePostSchema.parse(body);

      const existingPost = await this.postsService.getById(
        params.id,
        session.user.id,
      );

      if (!existingPost) {
        return { status: 404, body: null };
      }

      if (existingPost.authorId !== session.user.id) {
        return { status: 403, body: null };
      }

      const post = await this.postsService.update(
        params.id,
        session.user.id,
        input,
      );

      if (!post) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: post as any,
      };
    });
  }

  @TsRestHandler(postsContract.deletePost)
  async deletePost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.deletePost, async ({ params }) => {
      const existingPost = await this.postsService.getById(
        params.id,
        session.user.id,
      );

      if (!existingPost) {
        return { status: 404, body: null };
      }

      if (existingPost.authorId !== session.user.id) {
        return { status: 403, body: null };
      }

      const post = await this.postsService.delete(params.id, session.user.id);

      if (!post) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: post as any,
      };
    });
  }

  @TsRestHandler(postsContract.subscribeToPost)
  subscribeToPost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.subscribeToPost, async ({ params }) => {
      const subscription = await this.postsService.subscribe(
        params.id,
        session.user.id,
      );

      if (!subscription) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: postsContract.subscribeToPost.responses[200].parse(subscription),
      };
    });
  }

  @TsRestHandler(postsContract.unsubscribeFromPost)
  unsubscribeFromPost(@Session() session: UserSession) {
    return tsRestHandler(postsContract.unsubscribeFromPost, async ({ params }) => {
      const subscription = await this.postsService.unsubscribe(
        params.id,
        session.user.id,
      );

      if (!subscription) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: postsContract.unsubscribeFromPost.responses[200].parse(
          subscription,
        ),
      };
    });
  }

  @TsRestHandler(postsContract.getRecommendations)
  getRecommendations(@Session() session: UserSession) {
    return tsRestHandler(
      postsContract.getRecommendations,
      async ({ query }) => {
        const limit = query.limit ?? 20;
        const result = await this.postsService.recommendations(
          session.user.id,
          limit,
          query.cursor,
        );
        return {
          status: 200,
          body: postsContract.getRecommendations.responses[200].parse(result),
        };
      },
    );
  }

  @TsRestHandler(postsContract.listUserPosts)
  listUserPosts(@Session() session: UserSession) {
    return tsRestHandler(postsContract.listUserPosts, async ({ params }) => {
      const userPosts = await this.postsService.listByUser(
        params.id,
        session.user.id,
      );
      return {
        status: 200,
        body: userPosts as any,
      };
    });
  }
}
