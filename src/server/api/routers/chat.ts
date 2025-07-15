import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { aiService } from "~/server/services/aiService";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

const logger = createLogger("ChatRouter");

// Input validation schemas
const chatSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long"),
  model: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
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
        conversationId: input.conversationId,
        hasFileContext: !!input.fileContext,
        hasMcpContext: input.mcpContext.length > 0,
      });

      // Create or get conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const conversation = await db.conversation.create({
          data: {
            title:
              input.message.substring(0, 50) +
              (input.message.length > 50 ? "..." : ""),
            userId: input.userId,
          },
        });
        conversationId = conversation.id;
      }

      // Save user message to database
      await db.message.create({
        data: {
          conversationId,
          sender: "user",
          content: input.message,
        },
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

      // Save AI response to database
      await db.message.create({
        data: {
          conversationId,
          sender: "ai",
          content: response.text,
          model: response.model,
          mcpToolsUsed: response.mcpToolsUsed
            ? JSON.stringify(response.mcpToolsUsed)
            : null,
        },
      });

      // Update conversation's updatedAt timestamp
      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      logger.info("Chat response generated and saved", {
        responseLength: response.text.length,
        model: response.model,
        mcpToolsUsed: response.mcpToolsUsed?.length ?? 0,
        conversationId,
      });

      return {
        ...response,
        conversationId,
      };
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
        conversationId: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching chat history", {
        conversationId: input.conversationId,
        limit: input.limit,
      });

      try {
        const messages = await db.message.findMany({
          where: { conversationId: input.conversationId },
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          orderBy: { createdAt: "asc" },
        });

        let nextCursor: typeof input.cursor | undefined = undefined;
        if (messages.length > input.limit) {
          const nextItem = messages.pop();
          nextCursor = nextItem!.id;
        }

        // Parse mcpToolsUsed JSON
        const messagesWithParsedTools = messages.map((message) => ({
          ...message,
          mcpToolsUsed: message.mcpToolsUsed
            ? JSON.parse(message.mcpToolsUsed)
            : null,
        }));

        return {
          messages: messagesWithParsedTools,
          nextCursor,
          totalCount: await db.message.count({
            where: { conversationId: input.conversationId },
          }),
        };
      } catch (error) {
        logger.error(
          "Error fetching chat history",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch chat history",
        });
      }
    }),

  clearChatHistory: publicProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Clearing chat history", input);

      try {
        if (input.conversationId) {
          // Clear specific conversation
          await db.message.deleteMany({
            where: { conversationId: input.conversationId },
          });
        } else if (input.userId) {
          // Clear all conversations for a user
          await db.conversation.deleteMany({
            where: { userId: input.userId },
          });
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either conversationId or userId must be provided",
          });
        }

        return {
          success: true,
          message: "Chat history cleared",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        logger.error(
          "Error clearing chat history",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clear chat history",
        });
      }
    }),
});
