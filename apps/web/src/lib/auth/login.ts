import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import store from "@/lib/atoms/store";
import bearerToken from "@/lib/atoms/bearer-token";

async function setupToken() {
  const { data, error } = await authClient.token();
  if (error) {
    console.error("failed to get token", error);
    return false;
  }
  store.set(bearerToken, data.token);
  return true;
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<boolean> {
  const result = await authClient.signIn.email({
    email: email,
    password: password,
  });

  if (result.error) {
    toast.error("Login failed", {
      description: result.error.message || "Invalid email or password",
    });
    return false;
  }

  toast.success("Login successful", {
    description: "Welcome back!",
  });

  const tokenSetup = await setupToken();
  return tokenSetup;
}
