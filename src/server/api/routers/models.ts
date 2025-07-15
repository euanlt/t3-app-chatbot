import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { db } from "~/server/db";

const logger = createLogger("ModelsRouter");

// Model information type
interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  category: "free" | "premium" | "experimental" | "custom";
  recommended?: boolean;
  isCustom?: boolean;
}

// Curated list of popular models
const curatedModels: ModelInfo[] = [
  // FREE MODELS
  {
    id: "mistralai/mistral-small-3.2-24b-instruct:free",
    name: "Mistral Small 3.2 24B (Free)",
    provider: "Mistral AI",
    description: "High-quality free model with vision capabilities",
    pricing: { prompt: "0", completion: "0" },
    context_length: 96000,
    category: "free",
    recommended: true,
  },
  {
    id: "openrouter/cypher-alpha:free",
    name: "Cypher Alpha (Free)",
    provider: "OpenRouter",
    description:
      "All-purpose model supporting long-context tasks and code generation",
    pricing: { prompt: "0", completion: "0" },
    context_length: 1000000,
    category: "free",
  },
  {
    id: "liquid/lfm-40b:free",
    name: "Liquid LFM 40B (Free)",
    provider: "Liquid",
    description: "Free model optimized for efficiency",
    pricing: { prompt: "0", completion: "0" },
    context_length: 32768,
    category: "free",
  },
  {
    id: "openchat/openchat-7b:free",
    name: "OpenChat 7B (Free)",
    provider: "OpenChat",
    description: "Free conversational AI model",
    pricing: { prompt: "0", completion: "0" },
    context_length: 8192,
    category: "free",
  },
  {
    id: "gryphe/mythomist-7b:free",
    name: "MythoMist 7B (Free)",
    provider: "Gryphe",
    description: "Free model for creative tasks",
    pricing: { prompt: "0", completion: "0" },
    context_length: 32768,
    category: "free",
  },
  // PREMIUM MODELS
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Latest OpenAI model with vision, faster than GPT-4 Turbo",
    pricing: { prompt: "0.005", completion: "0.015" },
    context_length: 128000,
    category: "premium",
    recommended: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Anthropic's most intelligent model, great for complex tasks",
    pricing: { prompt: "0.003", completion: "0.015" },
    context_length: 200000,
    category: "premium",
    recommended: true,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    description: "Google's advanced model with large context window",
    pricing: { prompt: "0.0035", completion: "0.014" },
    context_length: 2097152,
    category: "premium",
  },
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and cost-effective for simple tasks",
    pricing: { prompt: "0.0005", completion: "0.0015" },
    context_length: 16385,
    category: "premium",
  },
];

export const modelsRouter = createTRPCRouter({
  getAvailableModels: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      includeCustom: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching available models", { userId: input.userId, includeCustom: input.includeCustom });

      try {
        let allModels: ModelInfo[] = [...curatedModels];

        // Add custom models if requested and user ID is provided
        if (input.includeCustom && input.userId) {
          const customModels = await db.customModel.findMany({
            where: {
              userId: input.userId,
              isActive: true,
            },
            orderBy: { createdAt: "desc" },
          });

          const customModelInfos: ModelInfo[] = customModels.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider,
            description: model.description || `Custom ${model.provider} model`,
            pricing: { prompt: "varies", completion: "varies" },
            context_length: 0, // Unknown for custom models
            category: "custom" as const,
            isCustom: true,
          }));

          allModels = [...allModels, ...customModelInfos];
        }

        return {
          models: allModels,
          totalCount: allModels.length,
        };
      } catch (error) {
        logger.error(
          "Error fetching models",
          error instanceof Error ? error : { error },
        );
        // Return curated list as fallback
        return {
          models: curatedModels,
          totalCount: curatedModels.length,
        };
      }
    }),

  getModelById: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        userId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching model by ID", { modelId: input.modelId, userId: input.userId });

      // First check curated models
      const curatedModel = curatedModels.find((m) => m.id === input.modelId);
      if (curatedModel) {
        return curatedModel;
      }

      // Then check custom models if user ID is provided
      if (input.userId) {
        try {
          const customModel = await db.customModel.findFirst({
            where: {
              id: input.modelId,
              userId: input.userId,
              isActive: true,
            },
          });

          if (customModel) {
            return {
              id: customModel.id,
              name: customModel.name,
              provider: customModel.provider,
              description: customModel.description || `Custom ${customModel.provider} model`,
              pricing: { prompt: "varies", completion: "varies" },
              context_length: 0,
              category: "custom" as const,
              isCustom: true,
            };
          }
        } catch (error) {
          logger.error("Error fetching custom model", { modelId: input.modelId, error });
        }
      }

      logger.warn("Model not found", { modelId: input.modelId });
      return null;
    }),

  getModelCategories: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      includeCustom: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching model categories", { userId: input.userId, includeCustom: input.includeCustom });

      try {
        let allModels: ModelInfo[] = [...curatedModels];

        // Add custom models if requested and user ID is provided
        if (input.includeCustom && input.userId) {
          const customModels = await db.customModel.findMany({
            where: {
              userId: input.userId,
              isActive: true,
            },
            orderBy: { createdAt: "desc" },
          });

          const customModelInfos: ModelInfo[] = customModels.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider,
            description: model.description || `Custom ${model.provider} model`,
            pricing: { prompt: "varies", completion: "varies" },
            context_length: 0,
            category: "custom" as const,
            isCustom: true,
          }));

          allModels = [...allModels, ...customModelInfos];
        }

        const categories = {
          free: allModels.filter((m) => m.category === "free"),
          premium: allModels.filter((m) => m.category === "premium"),
          experimental: allModels.filter((m) => m.category === "experimental"),
          custom: allModels.filter((m) => m.category === "custom"),
        };

        return {
          categories,
          counts: {
            free: categories.free.length,
            premium: categories.premium.length,
            experimental: categories.experimental.length,
            custom: categories.custom.length,
          },
        };
      } catch (error) {
        logger.error("Error fetching model categories", { error });
        
        // Return curated categories as fallback
        const categories = {
          free: curatedModels.filter((m) => m.category === "free"),
          premium: curatedModels.filter((m) => m.category === "premium"),
          experimental: curatedModels.filter((m) => m.category === "experimental"),
          custom: [],
        };

        return {
          categories,
          counts: {
            free: categories.free.length,
            premium: categories.premium.length,
            experimental: categories.experimental.length,
            custom: 0,
          },
        };
      }
    }),
});
