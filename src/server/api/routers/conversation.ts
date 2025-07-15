import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

const logger = createLogger("ConversationRouter");

export const conversationRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        logger.info("Creating new conversation", input);

        const conversation = await db.conversation.create({
          data: {
            title: input.title ?? "New Conversation",
            userId: input.userId,
          },
        });

        return conversation;
      } catch (error) {
        logger.error(
          "Error creating conversation",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { limit, cursor, userId } = input;

        const conversations = await db.conversation.findMany({
          where: userId ? { userId } : {},
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { updatedAt: "desc" },
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: {
                content: true,
                sender: true,
              },
            },
            _count: {
              select: { messages: true },
            },
          },
        });

        let nextCursor: typeof cursor | undefined = undefined;
        if (conversations.length > limit) {
          const nextItem = conversations.pop();
          nextCursor = nextItem!.id;
        }

        return {
          conversations,
          nextCursor,
        };
      } catch (error) {
        logger.error(
          "Error listing conversations",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list conversations",
        });
      }
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const conversation = await db.conversation.findUnique({
          where: { id: input.id },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        return conversation;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        logger.error(
          "Error getting conversation",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get conversation",
        });
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const conversation = await db.conversation.update({
          where: { id: input.id },
          data: { title: input.title },
        });

        return conversation;
      } catch (error) {
        logger.error(
          "Error updating conversation",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update conversation",
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await db.conversation.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        logger.error(
          "Error deleting conversation",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete conversation",
        });
      }
    }),

  deleteAll: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const where = input.userId ? { userId: input.userId } : {};

        const result = await db.conversation.deleteMany({ where });

        logger.info("Deleted conversations", { count: result.count });

        return {
          success: true,
          count: result.count,
        };
      } catch (error) {
        logger.error(
          "Error deleting all conversations",
          error instanceof Error ? error : { error },
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete conversations",
        });
      }
    }),
});
