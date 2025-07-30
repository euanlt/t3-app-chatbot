import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { db } from "~/server/db";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

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
  popularity_score?: number;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
}

// Provider type
type Provider = "openrouter" | "openai" | "anthropic" | "google";

// API key status type
interface ApiKeyStatus {
  provider: Provider;
  hasEnvKey: boolean;
  hasUserKey: boolean;
  isValid: boolean;
  keySource: "env" | "user" | "none";
}

// Curated list of popular models
const curatedModels: ModelInfo[] = [
  // FREE MODELS
  {
    id: "mistralai/mistral-small-3.2-24b-instruct:free",
    name: "Mistral Small 3.2 24B (Free)",
    provider: "openrouter",
    description: "Free model with vision support",
    pricing: { prompt: "0", completion: "0" },
    context_length: 96000,
    category: "free",
    recommended: true,
    popularity_score: 95,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "openrouter/cypher-alpha:free",
    name: "Cypher Alpha (Free)",
    provider: "openrouter",
    description: "Long-context tasks and coding",
    pricing: { prompt: "0", completion: "0" },
    context_length: 1000000,
    category: "free",
    popularity_score: 85,
    supports_vision: false,
    supports_function_calling: true,
  },
  {
    id: "liquid/lfm-40b:free",
    name: "Liquid LFM 40B (Free)",
    provider: "openrouter",
    description: "Efficient free model",
    pricing: { prompt: "0", completion: "0" },
    context_length: 32768,
    category: "free",
    popularity_score: 75,
    supports_vision: false,
    supports_function_calling: true,
  },
  {
    id: "openchat/openchat-7b:free",
    name: "OpenChat 7B (Free)",
    provider: "openrouter",
    description: "Conversational AI",
    pricing: { prompt: "0", completion: "0" },
    context_length: 8192,
    category: "free",
    popularity_score: 70,
    supports_vision: false,
    supports_function_calling: false,
  },
  {
    id: "gryphe/mythomist-7b:free",
    name: "MythoMist 7B (Free)",
    provider: "openrouter",
    description: "Creative writing tasks",
    pricing: { prompt: "0", completion: "0" },
    context_length: 32768,
    category: "free",
    popularity_score: 65,
    supports_vision: false,
    supports_function_calling: false,
  },
  // PREMIUM MODELS
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openrouter",
    description: "High-performance model with 128k context",
    pricing: { prompt: "0.01", completion: "0.03" },
    context_length: 128000,
    category: "premium",
    recommended: true,
    popularity_score: 98,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Latest OpenAI with vision support",
    pricing: { prompt: "0.005", completion: "0.015" },
    context_length: 128000,
    category: "premium",
    recommended: true,
    popularity_score: 97,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Anthropic's most intelligent model",
    pricing: { prompt: "0.003", completion: "0.015" },
    context_length: 200000,
    category: "premium",
    recommended: true,
    popularity_score: 96,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "google",
    description: "Large context window model",
    pricing: { prompt: "0.0035", completion: "0.014" },
    context_length: 2097152,
    category: "premium",
    popularity_score: 92,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "google",
    description: "Large context window",
    pricing: { prompt: "0.0035", completion: "0.014" },
    context_length: 2097152,
    category: "premium",
    popularity_score: 92,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "google",
    description: "Fast and efficient",
    pricing: { prompt: "0.00075", completion: "0.003" },
    context_length: 1048576,
    category: "premium",
    popularity_score: 89,
    supports_vision: true,
    supports_function_calling: true,
  },
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast and cost-effective",
    pricing: { prompt: "0.0005", completion: "0.0015" },
    context_length: 16385,
    category: "premium",
    popularity_score: 88,
    supports_vision: false,
    supports_function_calling: true,
  },
];

// Helper function to check API key status
async function checkApiKeyStatus(provider: Provider, userId?: string): Promise<ApiKeyStatus> {
  const hasEnvKey = Boolean(getEnvApiKey(provider));
  let hasUserKey = false;
  let isValid = false;
  let keySource: "env" | "user" | "none" = "none";

  // Check if user has API key stored
  if (userId) {
    try {
      const userApiKey = await db.userApiKey.findFirst({
        where: {
          userId,
          provider: provider === "google" ? "gemini" : provider,
          isActive: true,
        },
      });
      hasUserKey = Boolean(userApiKey);
    } catch (error) {
      logger.error("Error checking user API key", { provider, userId, error });
    }
  }

  // Determine key source and validity
  if (hasEnvKey) {
    keySource = "env";
    isValid = true; // Assume env keys are valid
  } else if (hasUserKey) {
    keySource = "user";
    isValid = true; // Assume stored user keys are valid
  }

  return {
    provider,
    hasEnvKey,
    hasUserKey,
    isValid,
    keySource,
  };
}

// Helper function to get environment API key
function getEnvApiKey(provider: Provider): string | undefined {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "google":
      return env.GOOGLE_GEMINI_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

// Helper function to get user API key from database
async function getUserApiKey(provider: Provider, userId?: string): Promise<string | undefined> {
  if (!userId) return undefined;
  
  try {
    const userApiKey = await db.userApiKey.findFirst({
      where: {
        userId,
        provider: provider === "google" ? "gemini" : provider,
        isActive: true,
      },
    });
    
    if (userApiKey) {
      // TODO: Decrypt the API key here
      return userApiKey.encryptedKey;
    }
  } catch (error) {
    logger.error("Error fetching user API key", { provider, userId, error });
  }
  
  return undefined;
}

// Function to fetch models from OpenRouter
async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    const models = data.data?.map((model: any) => {
      // Calculate popularity score based on OpenRouter's ranking
      const popularityScore = model.top_provider?.max_completion_tokens ? 
        Math.min(100, Math.max(10, (model.top_provider.max_completion_tokens / 1000))) : 50;

      // Clean up description - remove markdown links and truncate
      let description = model.description || model.id.split('/').pop() || model.id;
      // Remove markdown links
      description = description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      // Remove extra whitespace
      description = description.replace(/\s+/g, ' ').trim();
      // Truncate to 40 characters
      if (description.length > 40) {
        description = description.substring(0, 40) + "...";
      }

      return {
        id: model.id,
        name: model.name || model.id,
        provider: "openrouter",
        description,
        pricing: {
          prompt: model.pricing?.prompt || "0",
          completion: model.pricing?.completion || "0",
        },
        context_length: model.context_length || 4096,
        category: model.pricing?.prompt === "0" ? "free" : "premium",
        popularity_score: popularityScore,
        supports_vision: model.top_provider?.supports_vision || false,
        supports_function_calling: model.top_provider?.supports_tools || false,
      };
    }) || [];

    // Sort by popularity score (highest first)
    models.sort((a, b) => b.popularity_score - a.popularity_score);

    return models;
  } catch (error) {
    logger.error("Error fetching OpenRouter models", { error });
    return [];
  }
}

// Helper function to get OpenAI model display name
function getOpenAIDisplayName(modelId: string): string {
  const nameMap: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4o-realtime-preview": "GPT-4o Realtime",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4-turbo-preview": "GPT-4 Turbo Preview",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    "gpt-3.5-turbo-instruct": "GPT-3.5 Turbo Instruct",
    "text-davinci-003": "Davinci",
    "text-curie-001": "Curie",
  };
  
  return nameMap[modelId] || modelId;
}

// Function to fetch models from OpenAI
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data?.filter((model: any) => 
      model.id.includes("gpt") || model.id.includes("text-davinci") || model.id.includes("text-curie")
    ).map((model: any) => ({
      id: `openai/${model.id}`,
      name: getOpenAIDisplayName(model.id),
      provider: "openai",
      description: model.id,
      pricing: {
        prompt: "varies",
        completion: "varies",
      },
      context_length: 4096, // Default, varies by model
      category: "premium" as const,
      popularity_score: model.id.includes("gpt-4") ? 90 : 70,
      supports_vision: model.id.includes("vision") || model.id.includes("gpt-4o"),
      supports_function_calling: model.id.includes("gpt-3.5-turbo") || model.id.includes("gpt-4"),
    })) || [];
  } catch (error) {
    logger.error("Error fetching OpenAI models", { error });
    return [];
  }
}

// Function to fetch models from Anthropic
async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  // Anthropic doesn't have a public models endpoint, return known models
  return [
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      description: "Most intelligent Claude model",
      pricing: { prompt: "0.003", completion: "0.015" },
      context_length: 200000,
      category: "premium",
      popularity_score: 96,
      supports_vision: true,
      supports_function_calling: true,
    },
    {
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      provider: "anthropic",
      description: "Most powerful Claude model",
      pricing: { prompt: "0.015", completion: "0.075" },
      context_length: 200000,
      category: "premium",
      popularity_score: 94,
      supports_vision: true,
      supports_function_calling: true,
    },
    {
      id: "anthropic/claude-3-haiku",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      description: "Fast and cost-effective",
      pricing: { prompt: "0.00025", completion: "0.00125" },
      context_length: 200000,
      category: "premium",
      popularity_score: 85,
      supports_vision: true,
      supports_function_calling: true,
    },
  ];
}

// Function to fetch models from Google
async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      logger.error(`Google API error: ${response.status} ${response.statusText}`);
      // Return curated Google models as fallback
      return [
        {
          id: "google/gemini-pro-1.5",
          name: "Gemini Pro 1.5",
          provider: "google",
          description: "Large context window",
          pricing: { prompt: "0.0035", completion: "0.014" },
          context_length: 2097152,
          category: "premium",
          popularity_score: 92,
          supports_vision: true,
          supports_function_calling: true,
        },
        {
          id: "google/gemini-flash-1.5",
          name: "Gemini Flash 1.5",
          provider: "google",
          description: "Fast and efficient",
          pricing: { prompt: "0.00075", completion: "0.003" },
          context_length: 1048576,
          category: "premium",
          popularity_score: 89,
          supports_vision: true,
          supports_function_calling: true,
        },
        {
          id: "google/gemini-pro",
          name: "Gemini Pro",
          provider: "google",
          description: "General purpose model",
          pricing: { prompt: "0.001", completion: "0.002" },
          context_length: 32768,
          category: "premium",
          popularity_score: 85,
          supports_vision: true,
          supports_function_calling: true,
        },
      ];
    }

    const data = await response.json();
    
    const models = data.models?.filter((model: any) => 
      model.name.includes("gemini") && model.supportedGenerationMethods?.includes("generateContent")
    ).map((model: any) => {
      const modelId = model.name.split('/').pop();
      const displayName = model.displayName || modelId;
      
      return {
        id: `google/${modelId}`,
        name: displayName,
        provider: "google",
        description: modelId || "Gemini model",
        pricing: {
          prompt: "varies",
          completion: "varies",
        },
        context_length: model.inputTokenLimit || 32768,
        category: "premium" as const,
        popularity_score: modelId?.includes("pro") ? 90 : 75,
        supports_vision: model.supportedGenerationMethods?.includes("generateContent"),
        supports_function_calling: model.supportedGenerationMethods?.includes("generateContent"),
      };
    }) || [];

    return models.length > 0 ? models : [
      // Fallback models if API returns empty
      {
        id: "google/gemini-pro-1.5",
        name: "Gemini Pro 1.5",
        provider: "google",
        description: "Large context window",
        pricing: { prompt: "0.0035", completion: "0.014" },
        context_length: 2097152,
        category: "premium",
        popularity_score: 92,
        supports_vision: true,
        supports_function_calling: true,
      },
    ];
  } catch (error) {
    logger.error("Error fetching Google models", { error });
    // Return curated Google models as fallback
    return [
      {
        id: "google/gemini-pro-1.5",
        name: "Gemini Pro 1.5",
        provider: "google",
        description: "Large context window",
        pricing: { prompt: "0.0035", completion: "0.014" },
        context_length: 2097152,
        category: "premium",
        popularity_score: 92,
        supports_vision: true,
        supports_function_calling: true,
      },
      {
        id: "google/gemini-flash-1.5",
        name: "Gemini Flash 1.5",
        provider: "google",
        description: "Fast and efficient",
        pricing: { prompt: "0.00075", completion: "0.003" },
        context_length: 1048576,
        category: "premium",
        popularity_score: 89,
        supports_vision: true,
        supports_function_calling: true,
      },
    ];
  }
}

// Function to fetch live models from external APIs
async function fetchLiveModels(provider: Provider, userId?: string): Promise<ModelInfo[]> {
  // Try to get API key (env first, then user)
  let apiKey = getEnvApiKey(provider);
  if (!apiKey) {
    apiKey = await getUserApiKey(provider, userId);
  }

  if (!apiKey) {
    logger.warn(`No API key found for provider: ${provider}`);
    return [];
  }

  switch (provider) {
    case "openrouter":
      return await fetchOpenRouterModels(apiKey);
    case "openai":
      return await fetchOpenAIModels(apiKey);
    case "anthropic":
      return await fetchAnthropicModels(apiKey);
    case "google":
      return await fetchGoogleModels(apiKey);
    default:
      return [];
  }
}

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

  // Get API key status for all providers
  getApiKeyStatus: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      logger.info("Checking API key status", { userId: input.userId });

      const providers: Provider[] = ["openrouter", "openai", "anthropic", "google"];
      const statuses: ApiKeyStatus[] = [];

      for (const provider of providers) {
        const status = await checkApiKeyStatus(provider, input.userId);
        statuses.push(status);
      }

      return {
        providers: statuses,
        hasAnyKey: statuses.some(s => s.isValid),
      };
    }),

  // Get models filtered by provider with popularity ranking
  getModelsByProvider: publicProcedure
    .input(z.object({
      provider: z.enum(["openrouter", "openai", "anthropic", "google"]).optional(),
      userId: z.string().optional(),
      sortBy: z.enum(["popularity", "price", "context_length", "name"]).optional().default("popularity"),
      includeCustom: z.boolean().optional().default(true),
      useLiveData: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching models by provider", { provider: input.provider, sortBy: input.sortBy, useLiveData: input.useLiveData });

      try {
        let allModels: ModelInfo[] = [];

        // Use live data if requested and provider is specified
        if (input.useLiveData && input.provider) {
          const liveModels = await fetchLiveModels(input.provider, input.userId);
          allModels = [...liveModels];
        } else {
          // Use curated models as fallback
          allModels = [...curatedModels];
          
          // Filter by provider if specified
          if (input.provider) {
            allModels = allModels.filter(m => m.provider === input.provider);
          }
        }

        // Add custom models if requested and user ID is provided
        if (input.includeCustom && input.userId) {
          const customModels = await db.customModel.findMany({
            where: {
              userId: input.userId,
              isActive: true,
              ...(input.provider && { provider: input.provider === "google" ? "gemini" : input.provider }),
            },
            orderBy: { createdAt: "desc" },
          });

          const customModelInfos: ModelInfo[] = customModels.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider === "gemini" ? "google" : model.provider,
            description: model.description || `Custom ${model.provider} model`,
            pricing: { prompt: "varies", completion: "varies" },
            context_length: 0,
            category: "custom" as const,
            isCustom: true,
            popularity_score: 50, // Default score for custom models
            supports_vision: false,
            supports_function_calling: false,
          }));

          allModels = [...allModels, ...customModelInfos];
        }

        // Sort models
        switch (input.sortBy) {
          case "popularity":
            allModels.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
            break;
          case "price":
            allModels.sort((a, b) => {
              const aPrice = parseFloat(a.pricing.prompt) || 0;
              const bPrice = parseFloat(b.pricing.prompt) || 0;
              return aPrice - bPrice;
            });
            break;
          case "context_length":
            allModels.sort((a, b) => b.context_length - a.context_length);
            break;
          case "name":
            allModels.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }

        return {
          models: allModels,
          totalCount: allModels.length,
        };
      } catch (error) {
        logger.error("Error fetching models by provider", { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch models",
        });
      }
    }),

  // Search models across all providers
  searchModels: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      userId: z.string().optional(),
      provider: z.enum(["openrouter", "openai", "anthropic", "google"]).optional(),
      category: z.enum(["free", "premium", "experimental", "custom"]).optional(),
      includeCustom: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      logger.info("Searching models", { query: input.query, provider: input.provider });

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
            provider: model.provider === "gemini" ? "google" : model.provider,
            description: model.description || `Custom ${model.provider} model`,
            pricing: { prompt: "varies", completion: "varies" },
            context_length: 0,
            category: "custom" as const,
            isCustom: true,
            popularity_score: 50,
            supports_vision: false,
            supports_function_calling: false,
          }));

          allModels = [...allModels, ...customModelInfos];
        }

        // Apply filters
        if (input.provider) {
          allModels = allModels.filter(m => m.provider === input.provider);
        }

        if (input.category) {
          allModels = allModels.filter(m => m.category === input.category);
        }

        // Search functionality - case insensitive search in name and description
        const query = input.query.toLowerCase();
        const filteredModels = allModels.filter(model => 
          model.name.toLowerCase().includes(query) ||
          model.description.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query)
        );

        // Sort by relevance (prioritize name matches, then description matches)
        filteredModels.sort((a, b) => {
          const aNameMatch = a.name.toLowerCase().includes(query);
          const bNameMatch = b.name.toLowerCase().includes(query);
          
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          
          // If both or neither match name, sort by popularity
          return (b.popularity_score || 0) - (a.popularity_score || 0);
        });

        return {
          models: filteredModels,
          totalCount: filteredModels.length,
          query: input.query,
        };
      } catch (error) {
        logger.error("Error searching models", { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search models",
        });
      }
    }),
});
