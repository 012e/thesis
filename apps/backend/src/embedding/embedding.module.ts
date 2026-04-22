import { Module } from "@nestjs/common";

import { env } from "@/env";

import { EMBEDDING_SERVICE } from "./embedding.interface";
import { OpenAiEmbeddingService } from "./openai-embedding.service";
import { StubEmbeddingService } from "./stub-embedding.service";

/**
 * Provides the embedding service under the EMBEDDING_SERVICE injection token.
 *
 * - When OPENAI_API_KEY is set, the real OpenAI implementation is used.
 * - When the key is absent, the no-op stub (zero-vector) is used instead,
 *   which is safe for local development and integration tests.
 *
 * In integration tests you can still override the token explicitly via
 * moduleBuilder.overrideProvider(EMBEDDING_SERVICE) if needed.
 */
@Module({
  providers: [
    {
      provide: EMBEDDING_SERVICE,
      useClass: env.OPENAI_API_KEY
        ? OpenAiEmbeddingService
        : StubEmbeddingService,
    },
  ],
  exports: [EMBEDDING_SERVICE],
})
export class EmbeddingModule {}
