import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { env } from "~/env";
import { ensureDefaultUser } from "~/server/services/defaultUser";

const logger = createLogger("CustomModelsRouter");

// Encryption key for API keys (in production, use a proper key management system)
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || "default-key-change-in-production";

// Simple encryption/decryption functions
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Input validation schemas
const createCustomModelSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  modelId: z.string().min(1, "Model ID is required"),
  provider: z.enum(["openai", "gemini", "claude", "openrouter"]),
  description: z.string().optional(),
  userId: z.string().optional(),
});

const updateCustomModelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Model name is required").optional(),
  modelId: z.string().min(1, "Model ID is required").optional(),
  provider: z.enum(["openai", "gemini", "claude", "openrouter"]).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createApiKeySchema = z.object({
  provider: z.enum(["openai", "gemini", "claude", "openrouter"]),
  keyName: z.string().min(1, "Key name is required"),
  apiKey: z.string().min(1, "API key is required"),
  userId: z.string().optional(),
});

const updateApiKeySchema = z.object({
  id: z.string(),
  keyName: z.string().min(1, "Key name is required").optional(),
  apiKey: z.string().min(1, "API key is required").optional(),
  isActive: z.boolean().optional(),
});

export const customModelsRouter = createTRPCRouter({
  // Custom Models CRUD
  getCustomModels: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      provider: z.enum(["openai", "gemini", "claude", "openrouter"]).optional(),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching custom models", input);

      try {
        // Ensure default user exists
        if (input.userId === "default-user") {
          await ensureDefaultUser();
        }

        const models = await db.customModel.findMany({
          where: {
            userId: input.userId,
            provider: input.provider,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          models,
          totalCount: models.length,
        };
      } catch (error) {
        logger.error("Error fetching custom models", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch custom models",
        });
      }
    }),

  createCustomModel: publicProcedure
    .input(createCustomModelSchema)
    .mutation(async ({ input }) => {
      logger.info("Creating custom model", { name: input.name, provider: input.provider });

      try {
        // Ensure default user exists
        if (input.userId === "default-user") {
          await ensureDefaultUser();
        }

        const model = await db.customModel.create({
          data: {
            name: input.name,
            modelId: input.modelId,
            provider: input.provider,
            description: input.description,
            userId: input.userId,
          },
        });

        return model;
      } catch (error) {
        logger.error("Error creating custom model", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create custom model",
        });
      }
    }),

  updateCustomModel: publicProcedure
    .input(updateCustomModelSchema)
    .mutation(async ({ input }) => {
      logger.info("Updating custom model", { id: input.id });

      try {
        const model = await db.customModel.update({
          where: { id: input.id },
          data: {
            name: input.name,
            modelId: input.modelId,
            provider: input.provider,
            description: input.description,
            isActive: input.isActive,
          },
        });

        return model;
      } catch (error) {
        logger.error("Error updating custom model", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update custom model",
        });
      }
    }),

  deleteCustomModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      logger.info("Deleting custom model", { id: input.id });

      try {
        await db.customModel.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        logger.error("Error deleting custom model", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete custom model",
        });
      }
    }),

  // API Keys CRUD
  getUserApiKeys: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      provider: z.enum(["openai", "gemini", "claude", "openrouter"]).optional(),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching user API keys", input);

      try {
        // Ensure default user exists
        if (input.userId === "default-user") {
          await ensureDefaultUser();
        }

        const apiKeys = await db.userApiKey.findMany({
          where: {
            userId: input.userId,
            provider: input.provider,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            provider: true,
            keyName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // Don't return the encrypted key for security
          },
        });

        return {
          apiKeys,
          totalCount: apiKeys.length,
        };
      } catch (error) {
        logger.error("Error fetching user API keys", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch API keys",
        });
      }
    }),

  createApiKey: publicProcedure
    .input(createApiKeySchema)
    .mutation(async ({ input }) => {
      logger.info("Creating API key", { provider: input.provider, keyName: input.keyName });

      try {
        // Ensure default user exists
        if (input.userId === "default-user") {
          await ensureDefaultUser();
        }

        const encryptedKey = encrypt(input.apiKey);
        
        const apiKey = await db.userApiKey.create({
          data: {
            provider: input.provider,
            keyName: input.keyName,
            encryptedKey,
            userId: input.userId,
          },
          select: {
            id: true,
            provider: true,
            keyName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return apiKey;
      } catch (error) {
        logger.error("Error creating API key", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create API key",
        });
      }
    }),

  updateApiKey: publicProcedure
    .input(updateApiKeySchema)
    .mutation(async ({ input }) => {
      logger.info("Updating API key", { id: input.id });

      try {
        const updateData: {
          keyName?: string;
          isActive?: boolean;
          encryptedKey?: string;
        } = {
          keyName: input.keyName,
          isActive: input.isActive,
        };

        if (input.apiKey) {
          updateData.encryptedKey = encrypt(input.apiKey);
        }

        const apiKey = await db.userApiKey.update({
          where: { id: input.id },
          data: updateData,
          select: {
            id: true,
            provider: true,
            keyName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return apiKey;
      } catch (error) {
        logger.error("Error updating API key", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update API key",
        });
      }
    }),

  deleteApiKey: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      logger.info("Deleting API key", { id: input.id });

      try {
        await db.userApiKey.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        logger.error("Error deleting API key", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete API key",
        });
      }
    }),

  // Utility function to get decrypted API key (for internal use)
  getDecryptedApiKey: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      provider: z.enum(["openai", "gemini", "claude", "openrouter"]),
      keyName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      logger.info("Getting decrypted API key", { provider: input.provider, keyName: input.keyName });

      try {
        // If keyName is provided, look for that specific key
        // Otherwise, find the first active key for the provider
        const whereClause = input.keyName ? {
          userId: input.userId,
          provider: input.provider,
          keyName: input.keyName,
          isActive: true,
        } : {
          userId: input.userId,
          provider: input.provider,
          isActive: true,
        };

        const apiKey = await db.userApiKey.findFirst({
          where: whereClause,
          orderBy: { createdAt: "desc" }, // Get the most recent if multiple exist
        });

        if (!apiKey) {
          return null;
        }

        return {
          id: apiKey.id,
          provider: apiKey.provider,
          keyName: apiKey.keyName,
          decryptedKey: decrypt(apiKey.encryptedKey),
        };
      } catch (error) {
        logger.error("Error getting decrypted API key", error instanceof Error ? error : { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get API key",
        });
      }
    }),
});