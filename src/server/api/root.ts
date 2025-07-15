import { postRouter } from "~/server/api/routers/post";
import { chatRouter } from "~/server/api/routers/chat";
import { modelsRouter } from "~/server/api/routers/models";
import { filesRouter } from "~/server/api/routers/files";
import { mcpRouter } from "~/server/api/routers/mcp";
import { conversationRouter } from "~/server/api/routers/conversation";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  chat: chatRouter,
  models: modelsRouter,
  files: filesRouter,
  mcp: mcpRouter,
  conversation: conversationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
