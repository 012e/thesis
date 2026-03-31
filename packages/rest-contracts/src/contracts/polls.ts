import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { PollResults, VotePollBody } from "../schemas/poll";

const c = initContract();

export const pollsContract = c.router({
  votePoll: {
    method: "POST",
    path: "/posts/:id/poll/vote",
    pathParams: z.object({ id: z.string().uuid() }),
    body: VotePollBody,
    responses: {
      200: PollResults,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: "Vote on a poll (supports single or multiple selections based on poll settings)",
  },
  unvotePoll: {
    method: "DELETE",
    path: "/posts/:id/poll/vote",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: PollResults,
      404: z.object({ message: z.string() }),
    },
    summary: "Remove all votes from a poll",
  },
  getPollResults: {
    method: "GET",
    path: "/posts/:id/poll",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: PollResults,
      404: z.object({ message: z.string() }),
    },
    summary: "Get poll results including vote counts and user's votes",
  },
});

export type PollsContract = typeof pollsContract;
