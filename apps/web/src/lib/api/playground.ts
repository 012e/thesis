import type { ExecuteCodeBody, ExecutionResult } from "@repo/rest-contracts";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function executeCode(
  body: ExecuteCodeBody,
): Promise<ExecutionResult> {
  const response = await client.executeCode({ body });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 400) {
    throw new Error("Invalid request: check your code and language selection");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to execute code");
}
