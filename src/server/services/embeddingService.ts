import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { env } from "~/env";
import { createLogger } from "~/server/services/logger";

const logger = createLogger("EmbeddingService");

export class EmbeddingService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GOOGLE_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    }
  }

  /**
   * Generate embeddings for text using Google's embedding model
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.genAI) {
      logger.warn("Google API key not configured for embeddings");
      return null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      const result = await model.embedContent({
        content: { 
          role: "user",
          parts: [{ text }] 
        },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });

      const embedding = result.embedding.values;
      if (!embedding || embedding.length === 0) {
        logger.error("No embedding returned from Gemini");
        return null;
      }

      logger.debug("Generated embedding", { 
        dimensions: embedding.length,
        textLength: text.length 
      });

      return embedding;
    } catch (error) {
      logger.error("Failed to generate embedding:", error instanceof Error ? error : { error });
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.genAI) {
      logger.warn("Google API key not configured for embeddings");
      return texts.map(() => null);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      // Process in smaller batches to avoid rate limits
      const batchSize = 10; // Gemini has lower rate limits than OpenAI
      const results: (number[] | null)[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(text => 
          model.embedContent({
            content: { 
              role: "user",
              parts: [{ text }] 
            },
            taskType: TaskType.RETRIEVAL_DOCUMENT,
          }).then(result => result.embedding.values)
            .catch(error => {
              logger.error("Failed to generate embedding for text:", error);
              return null;
            })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add small delay to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info("Generated embeddings batch", { 
        total: texts.length, 
        successful: results.filter(r => r !== null).length 
      });

      return results;
    } catch (error) {
      logger.error("Failed to generate embeddings batch:", error instanceof Error ? error : { error });
      return texts.map(() => null);
    }
  }

  /**
   * Check if embedding service is available
   */
  isAvailable(): boolean {
    return this.genAI !== null;
  }

  /**
   * Get embedding dimensions for the current model
   */
  getEmbeddingDimensions(): number {
    // Gemini text-embedding-004 produces 768-dimensional embeddings
    return 768;
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();