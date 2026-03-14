import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { authContract } from '@repo/auth-contracts';

import { createPostSchema, updatePostSchema } from './posts.schemas';
import { PostsService } from './posts.service';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @TsRestHandler(authContract.listPosts)
  listPosts() {
    return tsRestHandler(authContract.listPosts, async () => {
      const posts = await this.postsService.list();

      return {
        status: 200,
        body: authContract.listPosts.responses[200].parse(posts),
      };
    });
  }

  @TsRestHandler(authContract.createPost)
  createPost(@Session() session: UserSession) {
    return tsRestHandler(authContract.createPost, async ({ body }) => {
      const input = createPostSchema.parse(body);
      const post = await this.postsService.create(session.user.id, input);

      return {
        status: 201,
        body: authContract.createPost.responses[201].parse(post),
      };
    });
  }

  @TsRestHandler(authContract.getPost)
  getPost() {
    return tsRestHandler(authContract.getPost, async ({ params }) => {
      const post = await this.postsService.getById(params.id);

      if (!post) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: authContract.getPost.responses[200].parse(post),
      };
    });
  }

  @TsRestHandler(authContract.updatePost)
  updatePost(@Session() session: UserSession) {
    return tsRestHandler(authContract.updatePost, async ({ params, body }) => {
      const input = updatePostSchema.parse(body);

      const existingPost = await this.postsService.getById(params.id);

      if (!existingPost) {
        return {
          status: 404,
          body: null,
        };
      }

      if (existingPost.authorId !== session.user.id) {
        return {
          status: 403,
          body: null,
        };
      }

      const post = await this.postsService.update(
        params.id,
        session.user.id,
        input,
      );

      if (!post) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: authContract.updatePost.responses[200].parse(post),
      };
    });
  }

  @TsRestHandler(authContract.deletePost)
  async deletePost(@Session() session: UserSession) {
    return tsRestHandler(authContract.deletePost, async ({ params }) => {
      const existingPost = await this.postsService.getById(params.id);

      if (!existingPost) {
        return {
          status: 404,
          body: null,
        };
      }

      if (existingPost.authorId !== session.user.id) {
        return {
          status: 403,
          body: null,
        };
      }

      const post = await this.postsService.delete(params.id, session.user.id);

      if (!post) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: authContract.deletePost.responses[200].parse(post),
      };
    });
  }
}
