import { createAuthClient } from "better-auth/react";
import { usernameClient, jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [usernameClient(), jwtClient()],
});

export * from "./utils";
export * from "./login";
export * from "./register";
export * from "./forgot-password";
export * from "./update-profile";
