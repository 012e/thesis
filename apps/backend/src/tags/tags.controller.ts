import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { tagsContract } from "@repo/rest-contracts";

import { TagsService } from "./tags.service";

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @TsRestHandler(tagsContract.getTrendingTags)
  getTrendingTags() {
    return tsRestHandler(tagsContract.getTrendingTags, async ({ query }) => {
      const limit = query.limit ?? 10;
      const windowHours = this.parseWindowHours(query.window);
      const result = await this.tagsService.getTrendingTags(limit, windowHours);

      return {
        status: 200 as const,
        body: result,
      };
    });
  }

  @TsRestHandler(tagsContract.suggestTags)
  suggestTags() {
    return tsRestHandler(tagsContract.suggestTags, async ({ query }) => {
      const result = await this.tagsService.suggestTags(
        query.q,
        query.limit ?? 10,
      );

      return {
        status: 200 as const,
        body: result,
      };
    });
  }

  @TsRestHandler(tagsContract.getTag)
  getTag() {
    return tsRestHandler(tagsContract.getTag, async ({ params }) => {
      const tag = await this.tagsService.getTag(params.slug);

      if (!tag) {
        return {
          status: 404 as const,
          body: null,
        };
      }

      return {
        status: 200 as const,
        body: tag,
      };
    });
  }

  @TsRestHandler(tagsContract.getTagPosts)
  getTagPosts(@Session() session: UserSession) {
    return tsRestHandler(
      tagsContract.getTagPosts,
      async ({ params, query }) => {
        const result = await this.tagsService.listPostsByTag(
          params.slug,
          session?.user?.id,
          (query.sort as "top" | "latest") ?? "top",
          query.limit ?? 20,
          query.cursor,
        );

        if (!result) {
          return {
            status: 404 as const,
            body: null,
          };
        }

        return {
          status: 200 as const,
          body: result,
        };
      },
    );
  }

  @TsRestHandler(tagsContract.getMyTagPreferences)
  getMyTagPreferences(@Session() session: UserSession) {
    return tsRestHandler(tagsContract.getMyTagPreferences, async () => {
      const result = await this.tagsService.listUserTagPreferences(
        session.user.id,
      );

      return {
        status: 200 as const,
        body: result,
      };
    });
  }

  @TsRestHandler(tagsContract.setMyTagPreference)
  setMyTagPreference(@Session() session: UserSession) {
    return tsRestHandler(
      tagsContract.setMyTagPreference,
      async ({ params, body }) => {
        const preference = await this.tagsService.setUserTagPreference(
          session.user.id,
          params.slug,
          body.preference,
        );

        if (!preference) {
          return {
            status: 404 as const,
            body: null,
          };
        }

        return {
          status: 200 as const,
          body: preference,
        };
      },
    );
  }

  @TsRestHandler(tagsContract.deleteMyTagPreference)
  deleteMyTagPreference(@Session() session: UserSession) {
    return tsRestHandler(
      tagsContract.deleteMyTagPreference,
      async ({ params }) => {
        const deleted = await this.tagsService.deleteUserTagPreference(
          session.user.id,
          params.slug,
        );

        if (!deleted) {
          return {
            status: 404 as const,
            body: null,
          };
        }

        return {
          status: 204 as const,
          body: undefined,
        };
      },
    );
  }

  private parseWindowHours(window?: string): number {
    if (!window) return 24;
    const match = window.match(/^(\d+)h$/);
    if (match) return Math.min(Number.parseInt(match[1], 10), 168);
    return 24;
  }
}
