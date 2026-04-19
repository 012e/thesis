import { NestExpressApplication } from "@nestjs/platform-express";
import { createCustomAuthClient } from "@repo/auth-client";

/**
 * Creates an auth client configured for testing that points to the test server.
 * This client wraps Better Auth's client methods and provides a test-friendly interface.
 */
export function createTestAuthClient(app: NestExpressApplication) {
  const server = app.getHttpServer();
  const address = server.address();
  const baseURL =
    typeof address === "string"
      ? address
      : `http://localhost:${address?.port || 3000}`;

  const client = createCustomAuthClient({
    baseURL,
  });

  return {
    /**
     * Register a new user with email and password
     */
    async register({
      email,
      password,
      name,
      username,
    }: {
      email: string;
      password: string;
      name: string;
      username: string;
    }) {
      return await client.signUp.email({
        email,
        password,
        name: name,
      });
    },

    /**
     * Sign in with email and password
     */
    async login({ email, password }: { email: string; password: string }) {
      return await client.signIn.email({
        email,
        password,
      });
    },

    /**
     * Get the current session
     */
    async getSession(sessionToken?: string) {
      if (sessionToken) {
        // Set the session token in headers for testing
        return await client.getSession({
          fetchOptions: {
            headers: {
              Cookie: `better-auth.session_token=${sessionToken}`,
            },
          },
        });
      }
      return await client.getSession();
    },

    /**
     * Sign out the current session
     */
    async signOut(sessionToken: string) {
      return await client.signOut({
        fetchOptions: {
          headers: {
            Cookie: `better-auth.session_token=${sessionToken}`,
          },
        },
      });
    },

    /**
     * Get JWT token for the current session
     */
    async getToken() {
      return await client.token();
    },

    // Expose raw client for advanced use cases
    raw: client,
  };
}

export type TestAuthClient = ReturnType<typeof createTestAuthClient>;
