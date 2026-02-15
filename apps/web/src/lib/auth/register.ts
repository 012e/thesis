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

export async function register({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<boolean> {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
  });

  if (error) {
    toast.error("Registration failed", {
      description: error.message || "Unable to create account",
    });
    return false;
  }

  if (data) {
    toast.success("Account created successfully", {
      description: "Welcome!",
    });

    const tokenSetup = await setupToken();
    return tokenSetup;
  }

  return false;
}
