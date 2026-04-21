import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

import { env } from "@/env";
import { EMBEDDING_DIMENSIONS } from "@/db/schema";

import type { IEmbeddingService } from "./embedding.interface";

/**
 * Generates text embeddings using OpenAI's text-embedding-3-small model.
 * Produces 1536-dimensional vectors suitable for cosine similarity search.
 * Only instantiated when OPENAI_API_KEY is present in the environment.
 */
@Injectable()
export class OpenAiEmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(OpenAiEmbeddingService.name);
  private readonly client: OpenAI;

  constructor() {
    // env.OPENAI_API_KEY is guaranteed non-null here because EmbeddingModule
    // only selects this class when the key is present.
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY! });
  }

  async embed(text: string): Promise<number[]> {
    this.logger.debug(`Embedding text (${text.length} chars)`);

    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  }
}
