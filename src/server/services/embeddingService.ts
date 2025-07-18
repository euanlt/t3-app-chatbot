import OpenAI from "openai";
import { env } from "~/env";
import { logger } from "~/utils/logger";

export class EmbeddingService {
  private openai: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Generate embeddings for text using OpenAI's embedding model
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      logger.warn("OpenAI API key not configured for embeddings");
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small", // Cheaper and faster than ada-002
        input: text,
        dimensions: 1536, // Standard dimension size
      });

      return response.data[0]?.embedding ?? null;
    } catch (error) {
      logger.error("Failed to generate embedding:", error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.openai) {
      logger.warn("OpenAI API key not configured for embeddings");
      return texts.map(() => null);
    }

    try {
      // OpenAI allows up to 2048 embeddings per request
      const batchSize = 100;
      const results: (number[] | null)[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
          dimensions: 1536,
        });

        results.push(
          ...response.data.map((item) => item.embedding as number[])
        );
      }

      return results;
    } catch (error) {
      logger.error("Failed to generate embeddings batch:", error);
      return texts.map(() => null);
    }
  }

  /**
   * Check if embedding service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();