import { initClient } from "@ts-rest/core";
import { authContract } from "@repo/auth-contracts";
import type { PostDto, PostContentDto } from "@repo/shared-dto";
import { env } from "@/env";

const client = initClient(authContract, {
  baseUrl: env.VITE_BACKEND_URL,
  baseHeaders: {},
  credentials: "include",
});

export async function createPost(content: PostContentDto): Promise<PostDto> {
  const response = await client.createPost({
    body: {
      content,
    },
  });

  if (response.status === 201) {
    return response.body;
  }

  throw new Error("Failed to create post");
}
