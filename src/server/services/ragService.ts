import { type PrismaClient } from "@prisma/client";
import { embeddingService } from "./embeddingService";
import { documentChunker } from "./documentChunker";
import { createLogger } from "~/server/services/logger";
import { db } from "~/server/db";

const logger = createLogger("RAGService");

export interface RAGSearchResult {
  content: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

export class RAGService {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database ?? db;
  }

  /**
   * Process a file and store its embeddings
   */
  async processFile(fileId: string): Promise<void> {
    try {
      // Get file from database
      const file = await this.db.file.findUnique({
        where: { id: fileId },
      });

      if (!file || !file.extractedText) {
        throw new Error("File not found or text not extracted");
      }

      // Update file status to processing
      await this.db.file.update({
        where: { id: fileId },
        data: { status: "processing" },
      });

      // Chunk the document
      const chunks = documentChunker.chunkStructuredText(
        file.extractedText,
        file.mimetype
      );

      // Generate embeddings for all chunks
      const texts = chunks.map((chunk) => chunk.content);
      const embeddings = await embeddingService.generateEmbeddings(texts);

      // Store embeddings in database
      const embeddingRecords = chunks.map((chunk, index) => ({
        fileId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embeddings[index] ? embeddings[index] : undefined,
        metadata: chunk.metadata,
      }));

      // Delete existing embeddings for this file (in case of reprocessing)
      await this.db.documentEmbedding.deleteMany({
        where: { fileId },
      });

      // Insert new embeddings
      await this.db.documentEmbedding.createMany({
        data: embeddingRecords,
      });

      // Update file status to completed
      await this.db.file.update({
        where: { id: fileId },
        data: { status: "completed" },
      });

      logger.info(`Processed file ${fileId} with ${chunks.length} chunks`);
    } catch (error) {
      logger.error(`Failed to process file ${fileId}:`, error instanceof Error ? error : { error });
      
      // Update file status to failed
      await this.db.file.update({
        where: { id: fileId },
        data: { 
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        },
      });
      
      throw error;
    }
  }

  /**
   * Search for relevant content using semantic similarity
   */
  async search(
    query: string,
    options: {
      limit?: number;
      fileIds?: string[];
      userId?: string;
    } = {}
  ): Promise<RAGSearchResult[]> {
    const { limit = 5, fileIds, userId } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      if (!queryEmbedding) {
        logger.warn("Could not generate embedding for query");
        return [];
      }

      // Build the where clause
      const whereClause: Record<string, unknown> = {};
      if (fileIds && fileIds.length > 0) {
        whereClause.fileId = { in: fileIds };
      }
      if (userId) {
        whereClause.file = { userId };
      }

      // Perform vector similarity search
      // Note: This is a simplified version. In production, you'd use pgvector's operators
      const embeddings = await this.db.documentEmbedding.findMany({
        where: whereClause,
        include: {
          file: {
            select: {
              id: true,
              originalName: true,
              userId: true,
            },
          },
        },
      });

      // Calculate similarities and sort
      const results = embeddings
        .map((embedding) => {
          if (!embedding.embedding) return null;
          
          const embeddingVector = embedding.embedding as number[];
          const similarity = this.cosineSimilarity(queryEmbedding, embeddingVector);
          
          return {
            content: embedding.content,
            fileId: embedding.fileId,
            fileName: embedding.file.originalName,
            chunkIndex: embedding.chunkIndex,
            similarity,
            metadata: embedding.metadata as Record<string, unknown>,
          };
        })
        .filter((result): result is RAGSearchResult => result !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      logger.error("RAG search failed:", error instanceof Error ? error : { error });
      return [];
    }
  }

  /**
   * Get context for a chat message using RAG
   */
  async getContext(
    message: string,
    conversationId?: string,
    limit: number = 5
  ): Promise<string> {
    try {
      // Get the user's files if we have a conversation
      let userFileIds: string[] = [];
      if (conversationId) {
        const conversation = await this.db.conversation.findUnique({
          where: { id: conversationId },
          include: {
            user: {
              include: {
                files: {
                  where: { status: "completed" },
                  select: { id: true },
                },
              },
            },
          },
        });

        if (conversation?.user?.files) {
          userFileIds = conversation.user.files.map((f) => f.id);
        }
      }

      // Search for relevant content
      const results = await this.search(message, {
        limit,
        fileIds: userFileIds.length > 0 ? userFileIds : undefined,
      });

      if (results.length === 0) {
        return "";
      }

      // Format context for the AI
      const context = results
        .map((result, index) => {
          const section = result.metadata.section ? ` (${result.metadata.section})` : "";
          return `[${index + 1}] From "${result.fileName}"${section}:\n${result.content}`;
        })
        .join("\n\n---\n\n");

      return `Based on the following relevant information from your documents:\n\n${context}\n\n`;
    } catch (error) {
      logger.error("Failed to get RAG context:", error instanceof Error ? error : { error });
      return "";
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// Export singleton instance
export const ragService = new RAGService();