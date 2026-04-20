import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { io as ioClient, type Socket } from "socket.io-client";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  registerAndGetSessionWithToken,
} from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

// ---------------------------------------------------------------------------
// Event name constants (kept local to avoid importing server-side modules
// before process.env.DATABASE_URL is set by createTestApp)
// ---------------------------------------------------------------------------

const WS_JOIN_CONVERSATION = "join-conversation";
const WS_SEND_MESSAGE = "send-message";
const WS_TYPING = "typing";
const WS_NEW_MESSAGE = "new-message";
const WS_TYPING_INDICATOR = "typing-indicator";
const WS_NEW_MESSAGE_NOTIFICATION = "new-message-notification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Connect a socket.io client to the /messages namespace using a Bearer token
 * for authentication and wait until the server confirms auth is complete
 * (via the 'authenticated' event). This prevents a race where the client
 * emits events before handleConnection (async) has finished setting userId.
 *
 * Rejects on connect_error, or if the server emits 'error' (unauthenticated)
 * before 'authenticated' arrives.
 */
function connectSocket(baseUrl: string, bearerToken: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`${baseUrl}/messages`, {
      auth: { token: bearerToken },
      transports: ["websocket"],
      forceNew: true,
    });

    const cleanup = () => {
      socket.off("authenticated", onAuth);
      socket.off("connect_error", onConnectError);
      socket.off("error", onError);
      socket.off("disconnect", onDisconnect);
    };

    const onAuth = () => {
      cleanup();
      resolve(socket);
    };
    const onConnectError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onError = (err: unknown) => {
      cleanup();
      reject(
        new Error(String((err as Record<string, unknown>)?.message ?? err)),
      );
    };
    // Unauthenticated clients: server emits 'error' then disconnects.
    // If the socket disconnects without ever authenticating, reject.
    const onDisconnect = () => {
      cleanup();
      reject(new Error("Disconnected before authentication completed"));
    };

    socket.once("authenticated", onAuth);
    socket.once("connect_error", onConnectError);
    socket.once("error", onError);
    socket.once("disconnect", onDisconnect);
  });
}

/**
 * Disconnect a socket and wait for the close to complete.
 */
function disconnectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve();
      return;
    }
    socket.once("disconnect", () => resolve());
    socket.disconnect();
  });
}

/**
 * Join a conversation room and await the join to be processed on the server
 * (uses acknowledgement-style timing: waits a tick after emit).
 */
function joinRoom(socket: Socket, conversationId: string): Promise<void> {
  return new Promise((resolve) => {
    socket.emit(WS_JOIN_CONVERSATION, { conversationId });
    // Give the server a moment to process the join before resolving
    setTimeout(resolve, 150);
  });
}

/**
 * Wait for the next occurrence of `event` on `socket` within `timeoutMs`.
 */
function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Wait for a specific event OR an `exception` event from the server,
 * resolving with { event, data }.
 */
function _waitForEventOrException(
  socket: Socket,
  event: string,
  timeoutMs = 4000,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}" or exception`)),
      timeoutMs,
    );

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      socket.off("exception", onException);
    };

    const onEvent = (data: unknown) => {
      cleanup();
      resolve({ event, data });
    };
    const onException = (data: unknown) => {
      cleanup();
      resolve({ event: "exception", data });
    };

    socket.on(event, onEvent);
    socket.on("exception", onException);
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("MessagesGateway WebSocket integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  // Three users: A follows B, C is unrelated
  let userACookie: string;
  let _userBCookie: string;
  let _userCCookie: string;

  let userAId: string;
  let userBId: string;

  let userAToken: string;
  let userBToken: string;
  let userCToken: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    ({
      cookie: userACookie,
      userId: userAId,
      bearerToken: userAToken,
    } = await registerAndGetSessionWithToken(
      server,
      `ws-a-${Date.now()}@example.com`,
      `ws_a_${Date.now()}`,
    ));

    ({
      cookie: _userBCookie,
      userId: userBId,
      bearerToken: userBToken,
    } = await registerAndGetSessionWithToken(
      server,
      `ws-b-${Date.now()}@example.com`,
      `ws_b_${Date.now()}`,
    ));

    ({ cookie: _userCCookie, bearerToken: userCToken } =
      await registerAndGetSessionWithToken(
        server,
        `ws-c-${Date.now()}@example.com`,
        `ws_c_${Date.now()}`,
      ));

    // A follows B so they can open a DM conversation
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE direct_messages, conversations RESTART IDENTITY CASCADE",
    );
  });

  // ─── Helper: create a conversation via REST and return its ID ─────────────
  async function createConversation(): Promise<string> {
    const res = await request(testApp.app.getHttpServer())
      .post("/conversations")
      .set("Cookie", userACookie)
      .send({ recipientId: userBId })
      .expect(201);
    return res.body.id as string;
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  describe("connection / authentication", () => {
    it("accepts a connection from a client with a valid bearer token", async () => {
      const socket = await connectSocket(testApp.baseUrl, userAToken);
      expect(socket.connected).toBe(true);
      await disconnectSocket(socket);
    });

    it("rejects a connection with no token", async () => {
      await expect(connectSocket(testApp.baseUrl, "")).rejects.toThrow();
    });

    it("rejects a connection with an invalid token", async () => {
      await expect(
        connectSocket(testApp.baseUrl, "not-a-valid-jwt"),
      ).rejects.toThrow();
    });
  });

  // ─── join-conversation ────────────────────────────────────────────────────

  describe(WS_JOIN_CONVERSATION, () => {
    it("allows a conversation participant to join the room", async () => {
      const convId = await createConversation();
      const socketA = await connectSocket(testApp.baseUrl, userAToken);

      socketA.emit(WS_JOIN_CONVERSATION, { conversationId: convId });

      // If no exception arrives within the window, the join succeeded.
      // waitForEvent rejects on timeout, so catch + return 'ok' to avoid
      // that rejection leaking through Promise.race.
      const outcome = await Promise.race([
        waitForEvent(socketA, "exception", 800)
          .then(() => "exception" as const)
          .catch(() => "ok" as const),
        new Promise<"ok">((resolve) => setTimeout(() => resolve("ok"), 1000)),
      ]);

      expect(outcome).toBe("ok");
      await disconnectSocket(socketA);
    });

    it("emits an exception when joining a conversation the user is not part of", async () => {
      const convId = await createConversation(); // A ↔ B
      const socketC = await connectSocket(testApp.baseUrl, userCToken);

      const resultPromise = waitForEvent(socketC, "exception", 2000);
      socketC.emit(WS_JOIN_CONVERSATION, { conversationId: convId });

      const result = await resultPromise;
      expect(result).toBeTruthy();

      await disconnectSocket(socketC);
    });

    it("emits an exception when conversation does not exist", async () => {
      const socketA = await connectSocket(testApp.baseUrl, userAToken);

      const resultPromise = waitForEvent(socketA, "exception", 2000);
      socketA.emit(WS_JOIN_CONVERSATION, {
        conversationId: "00000000-0000-0000-0000-000000000000",
      });

      const result = await resultPromise;
      expect(result).toBeTruthy();

      await disconnectSocket(socketA);
    });
  });

  // ─── send-message ─────────────────────────────────────────────────────────

  describe(WS_SEND_MESSAGE, () => {
    it("broadcasts new-message to both participants after send-message", async () => {
      const convId = await createConversation();

      const [socketA, socketB] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userBToken),
      ]);

      // Both users join the conversation room and wait for server to process
      await Promise.all([joinRoom(socketA, convId), joinRoom(socketB, convId)]);

      // Set up listener on B BEFORE A emits
      const msgOnBPromise = waitForEvent<Record<string, unknown>>(
        socketB,
        WS_NEW_MESSAGE,
      );
      const msgOnAPromise = waitForEvent<Record<string, unknown>>(
        socketA,
        WS_NEW_MESSAGE,
      );

      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "Hello via WS!",
      });

      const [msgOnA, msgOnB] = await Promise.all([
        msgOnAPromise,
        msgOnBPromise,
      ]);

      for (const msg of [msgOnA, msgOnB]) {
        expect(msg).toMatchObject({
          conversationId: convId,
          senderId: userAId,
          content: "Hello via WS!",
          type: "text",
          readAt: null,
        });
        expect(typeof msg.id).toBe("string");
        expect(typeof msg.createdAt).toBe("string");
      }

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketB)]);
    });

    it("persists the message so it is retrievable via REST", async () => {
      const convId = await createConversation();
      const socketA = await connectSocket(testApp.baseUrl, userAToken);

      await joinRoom(socketA, convId);

      const msgPromise = waitForEvent(socketA, WS_NEW_MESSAGE);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "Persistent message",
      });
      await msgPromise;

      // Confirm via REST
      const res = await request(testApp.app.getHttpServer())
        .get(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      const messages = res.body.messages as { content: string }[];
      expect(messages.some((m) => m.content === "Persistent message")).toBe(
        true,
      );

      await disconnectSocket(socketA);
    });

    it("emits an exception when the conversation does not exist", async () => {
      const socketA = await connectSocket(testApp.baseUrl, userAToken);

      const exceptionPromise = waitForEvent(socketA, "exception", 2000);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: "00000000-0000-0000-0000-000000000000",
        content: "Ghost",
      });

      const result = await exceptionPromise;
      expect(result).toBeTruthy();

      await disconnectSocket(socketA);
    });

    it("does not broadcast to clients that have not joined the room", async () => {
      const convId = await createConversation();

      const [socketA, socketC] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userCToken),
      ]);

      // Only A joins the room; C connects but does not join
      await joinRoom(socketA, convId);

      let cGotMessage = false;
      socketC.on(WS_NEW_MESSAGE, () => {
        cGotMessage = true;
      });

      const msgPromise = waitForEvent(socketA, WS_NEW_MESSAGE);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "Private",
      });
      await msgPromise;

      // Give C a brief window to (incorrectly) receive the event
      await new Promise((r) => setTimeout(r, 300));
      expect(cGotMessage).toBe(false);

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketC)]);
    });
  });

  // ─── typing ───────────────────────────────────────────────────────────────

  describe(WS_TYPING, () => {
    it("forwards typing-indicator to the other participant but not the sender", async () => {
      const convId = await createConversation();

      const [socketA, socketB] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userBToken),
      ]);

      await Promise.all([joinRoom(socketA, convId), joinRoom(socketB, convId)]);

      let senderGotIndicator = false;
      socketA.on(WS_TYPING_INDICATOR, () => {
        senderGotIndicator = true;
      });

      // Set up B's listener before A emits
      const indicatorOnBPromise = waitForEvent<Record<string, unknown>>(
        socketB,
        WS_TYPING_INDICATOR,
      );

      socketA.emit(WS_TYPING, { conversationId: convId, isTyping: true });

      const indicatorOnB = await indicatorOnBPromise;

      expect(indicatorOnB).toMatchObject({
        userId: userAId,
        conversationId: convId,
        isTyping: true,
      });

      // A must NOT receive its own typing indicator
      await new Promise((r) => setTimeout(r, 200));
      expect(senderGotIndicator).toBe(false);

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketB)]);
    });

    it("forwards isTyping: false (stopped typing) correctly", async () => {
      const convId = await createConversation();

      const [socketA, socketB] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userBToken),
      ]);

      await Promise.all([joinRoom(socketA, convId), joinRoom(socketB, convId)]);

      const indicatorPromise = waitForEvent<Record<string, unknown>>(
        socketB,
        WS_TYPING_INDICATOR,
      );

      socketA.emit(WS_TYPING, { conversationId: convId, isTyping: false });

      const indicator = await indicatorPromise;
      expect(indicator.isTyping).toBe(false);

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketB)]);
    });
  });

  // ─── multiple messages / ordering ─────────────────────────────────────────

  describe("message ordering", () => {
    it("receives messages in send order when sent sequentially", async () => {
      const convId = await createConversation();
      const socketA = await connectSocket(testApp.baseUrl, userAToken);

      await joinRoom(socketA, convId);

      const received: string[] = [];
      const messages = ["First", "Second", "Third"];

      // Collect all three messages
      const allReceived = new Promise<void>((resolve) => {
        socketA.on(WS_NEW_MESSAGE, (msg: { content: string }) => {
          received.push(msg.content);
          if (received.length === messages.length) resolve();
        });
      });

      for (const content of messages) {
        socketA.emit(WS_SEND_MESSAGE, { conversationId: convId, content });
        // Small delay so the server processes them in order
        await new Promise((r) => setTimeout(r, 50));
      }

      await allReceived;
      expect(received).toEqual(["First", "Second", "Third"]);

      await disconnectSocket(socketA);
    });
  });

  // ─── new-message-notification (per-user room) ─────────────────────────────

  describe(WS_NEW_MESSAGE_NOTIFICATION, () => {
    it("recipient receives notification without having joined the conversation room", async () => {
      const convId = await createConversation();

      // A sends; B connects but does NOT emit join-conversation
      const [socketA, socketB] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userBToken),
      ]);

      // A joins the conversation room to be able to send
      await joinRoom(socketA, convId);

      // B listens for the notification — no join-conversation emitted
      const notificationPromise = waitForEvent<Record<string, unknown>>(
        socketB,
        WS_NEW_MESSAGE_NOTIFICATION,
      );

      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "Notify B!",
      });

      const notification = await notificationPromise;

      expect(notification).toMatchObject({
        conversationId: convId,
        senderId: userAId,
        preview: "Notify B!",
      });

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketB)]);
    });

    it("preview is truncated to 100 characters", async () => {
      const convId = await createConversation();

      const [socketA, socketB] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userBToken),
      ]);

      await joinRoom(socketA, convId);

      const notificationPromise = waitForEvent<Record<string, unknown>>(
        socketB,
        WS_NEW_MESSAGE_NOTIFICATION,
      );

      const longContent = "x".repeat(200);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: longContent,
      });

      const notification = await notificationPromise;

      expect(typeof notification.preview).toBe("string");
      expect((notification.preview as string).length).toBe(100);

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketB)]);
    });

    it("non-participants do not receive new-message-notification", async () => {
      const convId = await createConversation(); // A ↔ B

      const [socketA, socketC] = await Promise.all([
        connectSocket(testApp.baseUrl, userAToken),
        connectSocket(testApp.baseUrl, userCToken), // C is not in the conversation
      ]);

      await joinRoom(socketA, convId);

      let cGotNotification = false;
      socketC.on(WS_NEW_MESSAGE_NOTIFICATION, () => {
        cGotNotification = true;
      });

      const msgOnA = waitForEvent(socketA, WS_NEW_MESSAGE);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "Private to B only",
      });
      await msgOnA;

      // Give C a window to (incorrectly) receive the notification
      await new Promise((r) => setTimeout(r, 300));
      expect(cGotNotification).toBe(false);

      await Promise.all([disconnectSocket(socketA), disconnectSocket(socketC)]);
    });

    it("sender does not receive notification for their own message", async () => {
      const convId = await createConversation();

      const socketA = await connectSocket(testApp.baseUrl, userAToken);
      await joinRoom(socketA, convId);

      let senderGotNotification = false;
      socketA.on(WS_NEW_MESSAGE_NOTIFICATION, () => {
        senderGotNotification = true;
      });

      const msgOnA = waitForEvent(socketA, WS_NEW_MESSAGE);
      socketA.emit(WS_SEND_MESSAGE, {
        conversationId: convId,
        content: "My own message",
      });
      await msgOnA;

      // Give sender a window to (incorrectly) receive self-notification
      await new Promise((r) => setTimeout(r, 300));
      expect(senderGotNotification).toBe(false);

      await disconnectSocket(socketA);
    });
  });
});
