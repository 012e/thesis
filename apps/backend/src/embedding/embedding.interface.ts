export const EMBEDDING_SERVICE = Symbol("EMBEDDING_SERVICE");

/**
 * Contract for any service that can produce a vector embedding from text.
 * Implementations may call OpenAI, a local model, or return a stub for testing.
 */
export interface IEmbeddingService {
  /**
   * Embed a piece of text into a float vector.
   * @param text - The text to embed. Must be non-empty.
   * @returns A float array whose length equals the model's dimensionality.
   * @throws When the underlying API call fails.
   */
  embed(text: string): Promise<number[]>;
}
