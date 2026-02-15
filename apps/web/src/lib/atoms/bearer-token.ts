import { atomWithStorage } from "jotai/utils";

const bearerToken = atomWithStorage<string | null | undefined>(
  "bearer_token",
  undefined,
);
export default bearerToken;
