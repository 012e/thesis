import { Injectable } from "@nestjs/common";

import { EMBEDDING_DIMENSIONS } from "@/db/schema";

import type { IEmbeddingService } from "./embedding.interface";

/**
 * A no-op implementation of IEmbeddingService for use in integration tests.
 * Returns a zero-vector of the correct dimensionality without making any
 * external API calls.
 */
@Injectable()
export class StubEmbeddingService implements IEmbeddingService {
  async embed(_text: string): Promise<number[]> {
    return new Array(EMBEDDING_DIMENSIONS).fill(0) as number[];
  }
}
