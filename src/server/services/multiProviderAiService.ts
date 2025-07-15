import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { env } from "~/env";
import { createLogger } from "./logger";
import type { Logger } from "./logger";
import { aiToolIntegration } from "./aiToolIntegration";
import { db } from "~/server/db";
import crypto from "crypto";

const logger = createLogger("MultiProviderAiService");

// Encryption key for API keys
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || "default-key-change-in-production";

// Decryption function
function decrypt(encryptedText: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error("Failed to decrypt API key", error instanceof Error ? error : { error });
    throw new Error("Failed to decrypt API key");
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MCPToolUsage {
  toolName: string;
  serverName: string;
  serverId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  timestamp: Date;
}

export interface ChatResponse {
  text: string;
  model: string;
  timestamp: Date;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  mcpToolsUsed: MCPToolUsage[];
}

export interface CustomModelInfo {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  description?: string;
  apiKey?: string;
}

export class MultiProviderAiService {
  private logger: Logger;
  private openRouterClient: ReturnType<typeof axios.create>;

  constructor() {
    this.logger = createLogger("MultiProviderAiService");
    
    // Initialize OpenRouter client (existing functionality)
    this.openRouterClient = axios.create({
      baseURL: "https://openrouter.ai/api/v1",
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add OpenRouter interceptors
    this.setupOpenRouterInterceptors();
  }

  private setupOpenRouterInterceptors() {
    this.openRouterClient.interceptors.request.use(
      (config) => {
        if (env.OPENROUTER_API_KEY) {
          config.headers.Authorization = `Bearer ${env.OPENROUTER_API_KEY}`;
        }
        config.headers["HTTP-Referer"] = "http://localhost:3000";
        config.headers["X-Title"] = "AI Chatbot T3";
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.openRouterClient.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }

  async getUserApiKey(userId: string | undefined, provider: string, keyName?: string): Promise<string | null> {
    if (!userId) return null;
    
    try {
      // If keyName is provided, look for that specific key
      // Otherwise, find the first active key for the provider
      const whereClause = keyName ? {
        userId,
        provider,
        keyName,
        isActive: true,
      } : {
        userId,
        provider,
        isActive: true,
      };

      const apiKey = await db.userApiKey.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" }, // Get the most recent if multiple exist
      });

      if (!apiKey) return null;
      
      return decrypt(apiKey.encryptedKey);
    } catch (error) {
      this.logger.error("Failed to get user API key", { provider, error });
      return null;
    }
  }

  async getChatCompletion(
    modelInfo: CustomModelInfo,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }> = [],
    fileContext = "",
    mcpContext: unknown[] = [],
    userId?: string,
  ): Promise<ChatResponse> {
    
    // Execute MCP tools first
    const { toolResults, mcpToolsUsed } = await this.executeMCPTools(
      message,
      modelInfo.modelId,
      chatHistory
    );

    // Route to appropriate provider
    switch (modelInfo.provider) {
      case "openai":
        return this.getOpenAICompletion(modelInfo, message, chatHistory, fileContext, mcpContext, toolResults, mcpToolsUsed, userId);
      case "gemini":
        return this.getGeminiCompletion(modelInfo, message, chatHistory, fileContext, mcpContext, toolResults, mcpToolsUsed, userId);
      case "claude":
        return this.getClaudeCompletion(modelInfo, message, chatHistory, fileContext, mcpContext, toolResults, mcpToolsUsed, userId);
      case "openrouter":
        return this.getOpenRouterCompletion(modelInfo, message, chatHistory, fileContext, mcpContext, toolResults, mcpToolsUsed);
      default:
        throw new Error(`Unsupported provider: ${modelInfo.provider}`);
    }
  }

  private async executeMCPTools(
    message: string,
    modelId: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>
  ): Promise<{ toolResults: string; mcpToolsUsed: MCPToolUsage[] }> {
    let toolResults = "";
    const mcpToolsUsed: MCPToolUsage[] = [];

    try {
      const formattedHistory = chatHistory.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message,
      }));

      const toolDecisions = await aiToolIntegration.determineToolUsage(
        message,
        modelId,
        formattedHistory,
      );

      if (toolDecisions.length > 0) {
        const startTime = Date.now();
        const { results, formattedResults } =
          await aiToolIntegration.executeToolDecisionsWithTracking(toolDecisions);
        toolResults = formattedResults;

        for (const result of results) {
          mcpToolsUsed.push({
            toolName: result.toolName,
            serverName: result.serverName,
            serverId: result.serverId,
            success: result.success,
            executionTime: result.executionTime ?? Date.now() - startTime,
            error: result.error,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.error("Failed to execute MCP tools", { error });
    }

    return { toolResults, mcpToolsUsed };
  }

  private formatMessages(
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults: string,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System message
    let systemContent =
      "You are a helpful AI assistant with the ability to access real-time information through external tools. " +
      "When users ask for information that could benefit from external tools, you should mention if tools were used or could be used. " +
      "Pay attention to the conversation context - if a user asks for 'more information' or refers to 'it' or 'that', look at previous messages to understand what they're referring to.";

    if (fileContext) {
      systemContent += `\n\nThe user has provided the following file content:\n${fileContext}`;
    }

    if (mcpContext && mcpContext.length > 0) {
      systemContent += `\n\nAdditional context from plugins:\n${JSON.stringify(mcpContext, null, 2)}`;
    }

    if (toolResults) {
      systemContent += `\n\n=== REAL-TIME INFORMATION RETRIEVED ===\nYou have successfully retrieved current, real-time information using external tools. This is NOT cached or historical data - it was just fetched moments ago.\n\n${toolResults}\n\n=== IMPORTANT INSTRUCTIONS ===\n1. Use the above real-time information to answer the user's question\n2. Present the information as current and up-to-date\n3. Do NOT say you cannot access the internet or browse the web - you just did!\n4. Cite the information naturally in your response\n5. The search results above are from live web sources\n6. If the user asks for more information, you can mention that additional queries can be made with the available tools`;
    }

    messages.push({ role: "system", content: systemContent });

    // Add chat history
    chatHistory.forEach((msg) => {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message,
      });
    });

    // Add current message
    messages.push({ role: "user", content: message });

    return messages;
  }

  private async getOpenAICompletion(
    modelInfo: CustomModelInfo,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults: string,
    mcpToolsUsed: MCPToolUsage[],
    userId?: string,
  ): Promise<ChatResponse> {
    const apiKey = modelInfo.apiKey || await this.getUserApiKey(userId, "openai") || env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not configured. Please add an OpenAI API key in the Models tab → API Keys section.");
    }

    const openai = new OpenAI({ apiKey });
    
    const messages = this.formatMessages(message, chatHistory, fileContext, mcpContext, toolResults);
    
    try {
      const response = await openai.chat.completions.create({
        model: modelInfo.modelId,
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("No response content from OpenAI");
      }

      return {
        text: aiResponse,
        model: response.model,
        timestamp: new Date(),
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
        mcpToolsUsed,
      };
    } catch (error) {
      this.logger.error("OpenAI API error", { error });
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getGeminiCompletion(
    modelInfo: CustomModelInfo,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults: string,
    mcpToolsUsed: MCPToolUsage[],
    userId?: string,
  ): Promise<ChatResponse> {
    const userApiKey = await this.getUserApiKey(userId, "gemini");
    const apiKey = modelInfo.apiKey || userApiKey || env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key not configured. Please add a Gemini API key in the Models tab → API Keys section.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Format conversation for Gemini
    const messages = this.formatMessages(message, chatHistory, fileContext, mcpContext, toolResults);
    const systemInstruction = messages[0]?.content || "";
    const conversationMessages = messages.slice(1);
    
    // Create model with system instruction
    const model = genAI.getGenerativeModel({ 
      model: modelInfo.modelId,
      systemInstruction: systemInstruction
    });
    
    // Format history for Gemini (excluding system message and current user message)
    const history = conversationMessages.slice(0, -1).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const userMessage = conversationMessages[conversationMessages.length - 1]?.content || message;

    try {
      const chat = model.startChat({
        history: history,
      });

      const result = await chat.sendMessage(userMessage);
      const aiResponse = result.response.text();

      if (!aiResponse) {
        throw new Error("No response content from Gemini");
      }

      return {
        text: aiResponse,
        model: modelInfo.modelId,
        timestamp: new Date(),
        mcpToolsUsed,
      };
    } catch (error) {
      this.logger.error("Gemini API error", { error });
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getClaudeCompletion(
    modelInfo: CustomModelInfo,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults: string,
    mcpToolsUsed: MCPToolUsage[],
    userId?: string,
  ): Promise<ChatResponse> {
    const apiKey = modelInfo.apiKey || await this.getUserApiKey(userId, "claude");
    
    if (!apiKey) {
      throw new Error("Claude API key not configured. Please add a Claude API key in the Models tab → API Keys section.");
    }

    const anthropic = new Anthropic({ apiKey });
    
    const messages = this.formatMessages(message, chatHistory, fileContext, mcpContext, toolResults);
    const systemMessage = messages[0]?.content || "";
    const conversationMessages = messages.slice(1);

    try {
      const response = await anthropic.messages.create({
        model: modelInfo.modelId,
        max_tokens: 3000,
        temperature: 0.7,
        system: systemMessage,
        messages: conversationMessages.map(msg => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        })),
      });

      const aiResponse = response.content[0]?.type === "text" ? response.content[0].text : "";
      if (!aiResponse) {
        throw new Error("No response content from Claude");
      }

      return {
        text: aiResponse,
        model: response.model,
        timestamp: new Date(),
        usage: response.usage ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
        mcpToolsUsed,
      };
    } catch (error) {
      this.logger.error("Claude API error", { error });
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getOpenRouterCompletion(
    modelInfo: CustomModelInfo,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults: string,
    mcpToolsUsed: MCPToolUsage[],
  ): Promise<ChatResponse> {
    const messages = this.formatMessages(message, chatHistory, fileContext, mcpContext, toolResults);
    
    try {
      const response = await this.openRouterClient.post("/chat/completions", {
        model: modelInfo.modelId,
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      });

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("Invalid response from OpenRouter API: no choices array");
      }

      const aiResponse = response.data.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("No response content from OpenRouter");
      }

      return {
        text: aiResponse,
        model: response.data.model || modelInfo.modelId,
        timestamp: new Date(),
        usage: response.data.usage,
        mcpToolsUsed,
      };
    } catch (error) {
      this.logger.error("OpenRouter API error", { error });
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          throw new Error("Invalid API key. Please check your OpenRouter API key.");
        } else if (status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else if (status === 402) {
          throw new Error("Insufficient credits. Please add credits to your OpenRouter account.");
        }
      }
      throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const multiProviderAiService = new MultiProviderAiService();