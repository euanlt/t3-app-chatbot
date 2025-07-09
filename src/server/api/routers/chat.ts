import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { aiService } from "~/server/services/aiService";
import { TRPCError } from "@trpc/server";

const logger = createLogger("ChatRouter");

// Input validation schemas
const chatSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long"),
  model: z.string().optional(),
  chatHistory: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        message: z.string(),
        timestamp: z.date(),
        model: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  fileContext: z.string().optional().default(""),
  mcpContext: z.array(z.any()).optional().default([]),
});

export const chatRouter = createTRPCRouter({
  sendMessage: publicProcedure.input(chatSchema).mutation(async ({ input }) => {
    try {
      logger.info("Processing chat message", {
        messageLength: input.message.length,
        model: input.model ?? "default",
        hasFileContext: !!input.fileContext,
        hasMcpContext: input.mcpContext.length > 0,
      });

      // Log the model being used
      const modelToUse =
        input.model ?? "mistralai/mistral-small-3.2-24b-instruct:free";
      logger.info("Using model", { model: modelToUse });

      // Call the AI service
      const response = await aiService.getChatCompletion(
        modelToUse,
        input.message,
        input.chatHistory,
        input.fileContext,
        input.mcpContext,
      );

      logger.info("Chat response generated", {
        responseLength: response.text.length,
        model: response.model,
        mcpToolsUsed: response.mcpToolsUsed?.length ?? 0,
      });

      return response;
    } catch (error) {
      logger.error(
        "Error processing chat message",
        error instanceof Error ? error : { error },
      );

      if (error instanceof Error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process chat message",
      });
    }
  }),

  getChatHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching chat history", { limit: input.limit });

      // For now, return empty history
      return {
        messages: [],
        totalCount: 0,
      };
    }),

  clearChatHistory: publicProcedure.mutation(async () => {
    logger.info("Clearing chat history");

    return {
      success: true,
      message: "Chat history cleared",
    };
  }),
});
