import { z } from "zod";
import { VotePollBody } from "@repo/rest-contracts";

export const votePollSchema = VotePollBody;

export type VotePollInput = z.infer<typeof votePollSchema>;
