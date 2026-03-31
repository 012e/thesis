import type { PollResultsDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function votePoll(
  postId: string,
  optionIds: string[],
): Promise<PollResultsDto> {
  const response = await client.votePoll({
    params: { id: postId },
    body: { optionIds },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error(response.body.message);
  }

  if (response.status === 400) {
    throw new Error(response.body.message);
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to vote on poll");
}

export async function unvotePoll(postId: string): Promise<PollResultsDto> {
  const response = await client.unvotePoll({
    params: { id: postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error(response.body.message);
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to remove poll vote");
}

export async function getPollResults(postId: string): Promise<PollResultsDto> {
  const response = await client.getPollResults({
    params: { id: postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error(response.body.message);
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to get poll results");
}
