import { client } from ".";

export async function login(username: string, password: string) {
  const res = await client.login({ body: { username, password } });
  return res;
}

export async function me() {
  const res = await client.me();
  return res;
}

export default client;
