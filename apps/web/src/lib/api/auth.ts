import { initClient } from "@ts-rest/core";
import authContract from "@repo/auth-contracts";

const client = initClient(authContract, {
  baseUrl: "/", // adjust to backend base URL in real projects
});

export async function login(username: string, password: string) {
  const res = await client.login({ body: { username, password } });
  return res;
}

export async function me() {
  const res = await client.me();
  return res;
}

export default client;
