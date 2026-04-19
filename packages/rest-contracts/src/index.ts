import { initContract } from '@ts-rest/core';
import type { AppRouter } from '@ts-rest/core';
import { authContract } from './contracts/auth';
import { postsContract } from './contracts/posts';
import { reactionsContract } from './contracts/reactions';
import { followsContract } from './contracts/follows';
import { threadsContract } from './contracts/threads';
import { commentsContract } from './contracts/comments';
import { usersContract } from './contracts/users';
import { pollsContract } from './contracts/polls';
import { playgroundContract } from './contracts/playground';
import { messagesContract } from './contracts/messages';
import { notificationsContract } from './contracts/notifications';

const c = initContract();

export const appContract = c.router({
  ...authContract,
  ...postsContract,
  ...reactionsContract,
  ...followsContract,
  ...threadsContract,
  ...commentsContract,
  ...usersContract,
  ...pollsContract,
  ...playgroundContract,
  ...messagesContract,
  ...notificationsContract,
}) satisfies AppRouter;

export type AppContract = typeof appContract;

// Re-export all contracts
export { authContract } from "./contracts/auth";
export type { AuthContract } from "./contracts/auth";

export { postsContract } from "./contracts/posts";
export type { PostsContract } from "./contracts/posts";

export { reactionsContract } from "./contracts/reactions";
export type { ReactionsContract } from "./contracts/reactions";

export { followsContract } from "./contracts/follows";
export type { FollowsContract } from "./contracts/follows";

export { threadsContract } from "./contracts/threads";
export type { ThreadsContract } from "./contracts/threads";

export { commentsContract } from "./contracts/comments";
export type { CommentsContract } from "./contracts/comments";

export { messagesContract } from "./contracts/messages";
export type { MessagesContract } from "./contracts/messages";

export { notificationsContract } from './contracts/notifications';
export type { NotificationsContract } from './contracts/notifications';

// Re-export all schemas
export * from './schemas/shared';
export * from './schemas/post';
export * from './schemas/reaction';
export * from './schemas/follow';
export * from './schemas/thread';
export * from './schemas/comment';
export * from './schemas/poll';
export * from './schemas/message';
export * from './schemas/notification';

export default appContract;

export { usersContract } from "./contracts/users";
export type { UsersContract } from "./contracts/users";

export { pollsContract } from "./contracts/polls";
export type { PollsContract } from "./contracts/polls";

export { playgroundContract } from "./contracts/playground";
export type { PlaygroundContract } from "./contracts/playground";

export * from "./schemas/user";
export * from "./schemas/playground";
