import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";

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
  category: "free" | "premium" | "experimental";
  recommended?: boolean;
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
  getAvailableModels: publicProcedure.query(async () => {
    logger.info("Fetching available models");

    try {
      // For now, return the curated list
      // TODO: Integrate with OpenRouter API when API key is configured
      return {
        models: curatedModels,
        totalCount: curatedModels.length,
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
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching model by ID", { modelId: input.modelId });

      const model = curatedModels.find((m) => m.id === input.modelId);

      if (!model) {
        logger.warn("Model not found", { modelId: input.modelId });
        return null;
      }

      return model;
    }),

  getModelCategories: publicProcedure.query(async () => {
    logger.info("Fetching model categories");

    const categories = {
      free: curatedModels.filter((m) => m.category === "free"),
      premium: curatedModels.filter((m) => m.category === "premium"),
      experimental: curatedModels.filter((m) => m.category === "experimental"),
    };

    return {
      categories,
      counts: {
        free: categories.free.length,
        premium: categories.premium.length,
        experimental: categories.experimental.length,
      },
    };
  }),
});
