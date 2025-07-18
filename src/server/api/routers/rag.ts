import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ragService } from "~/server/services/ragService";
import { createLogger } from "~/server/services/logger";
import { TRPCError } from "@trpc/server";

const logger = createLogger("RAGRouter");

export const ragRouter = createTRPCRouter({
  /**
   * Search for relevant content using RAG
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(1000),
        limit: z.number().min(1).max(20).optional().default(5),
        fileIds: z.array(z.string()).optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        logger.info("RAG search request", {
          queryLength: input.query.length,
          limit: input.limit,
          fileIds: input.fileIds?.length,
        });

        const results = await ragService.search(input.query, {
          limit: input.limit,
          fileIds: input.fileIds,
          userId: input.userId,
        });

        logger.info("RAG search completed", {
          resultsCount: results.length,
        });

        return {
          results,
          query: input.query,
        };
      } catch (error) {
        logger.error("RAG search failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform search",
        });
      }
    }),

  /**
   * Process a file for RAG
   */
  processFile: publicProcedure
    .input(
      z.object({
        fileId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        logger.info("Processing file for RAG", { fileId: input.fileId });

        await ragService.processFile(input.fileId);

        return {
          success: true,
          fileId: input.fileId,
        };
      } catch (error) {
        logger.error("Failed to process file for RAG", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to process file",
        });
      }
    }),

  /**
   * Get RAG status for files
   */
  getFileStatus: publicProcedure
    .input(
      z.object({
        fileIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const embeddings = await ctx.db.documentEmbedding.groupBy({
          by: ["fileId"],
          where: {
            fileId: { in: input.fileIds },
          },
          _count: {
            id: true,
          },
        });

        const status = input.fileIds.map((fileId) => {
          const embedding = embeddings.find((e) => e.fileId === fileId);
          return {
            fileId,
            hasEmbeddings: !!embedding,
            embeddingCount: embedding?._count.id ?? 0,
          };
        });

        return status;
      } catch (error) {
        logger.error("Failed to get file status", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get file status",
        });
      }
    }),
});