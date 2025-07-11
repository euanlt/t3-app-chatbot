import axios from "axios";
import { env } from "~/env";
import { createLogger } from "./logger";
import type { Logger } from "./logger";
import { aiToolIntegration } from "./aiToolIntegration";

// const logger = createLogger('AiService');

// OpenRouter API base URL
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

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

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AiService {
  private apiClient;
  private logger: Logger;

  constructor() {
    this.logger = createLogger("AiService");

    // Create axios instance with interceptors
    this.apiClient = axios.create({
      baseURL: OPENROUTER_API_URL,
      timeout: 60000, // 60 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        // Add auth header
        if (env.OPENROUTER_API_KEY) {
          config.headers.Authorization = `Bearer ${env.OPENROUTER_API_KEY}`;
        }

        // Add OpenRouter specific headers
        config.headers["HTTP-Referer"] = "http://localhost:3000";
        config.headers["X-Title"] = "AI Chatbot T3";

        this.logger.debug("Making API request", {
          method: config.method,
          url: config.url,
          model: (config.data as { model?: string })?.model,
        });

        return config;
      },
      (error) => {
        this.logger.error(
          "Request error",
          error instanceof Error ? error : { error },
        );
        return Promise.reject(error as Error);
      },
    );

    // Add response interceptor
    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug("API response received", {
          status: response.status,
          model: (response.data as { model?: string })?.model,
        });
        return response;
      },
      (error: unknown) => {
        const err = error as {
          response?: { status?: number; data?: unknown };
          message?: string;
        };
        this.logger.error("Response error", {
          status: err.response?.status,
          message: err.message ?? "Unknown error",
          data: err.response?.data,
        });
        return Promise.reject(
          error instanceof Error ? error : new Error("Unknown error"),
        );
      },
    );
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async getChatCompletion(
    modelId: string,
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }> = [],
    fileContext = "",
    mcpContext: unknown[] = [],
  ) {
    // First, check if we should use any MCP tools
    let toolResults = "";
    const mcpToolsUsed: MCPToolUsage[] = [];

    try {
      // Use AI to determine which tools to use
      // Convert chat history to the format expected by aiToolIntegration
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
        this.logger.info("AI decided to use MCP tools", {
          count: toolDecisions.length,
          tools: toolDecisions.map((d) => `${d.serverName}/${d.toolName}`),
        });

        // Execute the tools and track usage
        const startTime = Date.now();
        const { results, formattedResults } =
          await aiToolIntegration.executeToolDecisionsWithTracking(
            toolDecisions,
          );
        toolResults = formattedResults;

        // Convert results to MCPToolUsage format
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

        this.logger.info("MCP tool results obtained", {
          resultLength: toolResults.length,
          toolsExecuted: mcpToolsUsed.length,
          preview: toolResults.substring(0, 100),
        });
      } else {
        this.logger.debug("No MCP tools needed for this message");
      }
    } catch (error) {
      this.logger.error("Failed to execute MCP tools", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    // Debug log
    this.logger.info("getChatCompletion called", {
      modelId,
      hasApiKey: !!env.OPENROUTER_API_KEY,
      apiKeyLength: env.OPENROUTER_API_KEY?.length || 0,
    });

    if (
      !env.OPENROUTER_API_KEY ||
      env.OPENROUTER_API_KEY === "your_openrouter_api_key" ||
      env.OPENROUTER_API_KEY.trim() === ""
    ) {
      this.logger.warn("OpenRouter API key not configured", {
        hasKey: !!env.OPENROUTER_API_KEY,
        keyValue: env.OPENROUTER_API_KEY ? "exists but hidden" : "missing",
      });
      throw new Error(
        "OpenRouter API key not configured. Please add your API key to the .env file.",
      );
    }

    try {
      // Format messages for the API with tool results
      const messages = this.formatMessages(
        message,
        chatHistory,
        fileContext,
        mcpContext,
        toolResults,
      );

      this.logger.info("Sending chat completion request", {
        model: modelId,
        messageCount: messages.length,
        hasFileContext: !!fileContext,
        hasMcpContext: mcpContext.length > 0,
      });

      // Make the API request
      const response = await this.apiClient.post<ChatCompletionResponse>(
        "/chat/completions",
        {
          model: modelId ?? "mistralai/mistral-small-3.2-24b-instruct:free",
          messages: messages,
          max_tokens: 3000,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        },
      );

      // Extract the response with proper error handling
      if (!response.data.choices || response.data.choices.length === 0) {
        this.logger.error("Invalid API response structure", {
          responseData: response.data,
          hasChoices: !!response.data.choices,
          choicesLength: response.data.choices?.length,
        });
        throw new Error(
          "Invalid response from OpenRouter API: no choices array",
        );
      }

      const aiResponse = response.data.choices[0]?.message?.content;

      if (!aiResponse) {
        this.logger.error("No response content in choices", {
          choice: response.data.choices[0],
          hasMessage: !!response.data.choices[0]?.message,
          hasContent: !!response.data.choices[0]?.message?.content,
        });
        throw new Error("No response content from AI");
      }

      this.logger.info("Chat completion successful", {
        model: response.data.model,
        responseLength: aiResponse.length,
        usage: response.data.usage,
      });

      return {
        text: aiResponse,
        model: response.data.model || modelId,
        timestamp: new Date(),
        usage: response.data.usage,
        mcpToolsUsed,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error(
            "Invalid API key. Please check your OpenRouter API key.",
          );
        } else if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else if (error.response?.status === 402) {
          throw new Error(
            "Insufficient credits. Please add credits to your OpenRouter account.",
          );
        }

        const responseData = error.response?.data as
          | { error?: { message?: string } }
          | undefined;
        const errorMessage = responseData?.error?.message ?? error.message;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Format messages for the OpenRouter API
   */
  private formatMessages(
    message: string,
    chatHistory: Array<{ sender: "user" | "ai"; message: string }>,
    fileContext: string,
    mcpContext: unknown[],
    toolResults = "",
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

  /**
   * Get mock response for testing
   */
  getMockResponse(
    message: string,
    modelId: string,
    fileContext: string,
    mcpContext: unknown[],
  ) {
    this.logger.info("Returning mock response");

    let response = `I received your message: "${message}"`;

    if (fileContext) {
      response += `\n\nI can see you've uploaded a file with ${fileContext.length} characters of content.`;
    }

    if (mcpContext.length > 0) {
      response += `\n\nI also have context from ${mcpContext.length} MCP plugin(s).`;
    }

    response +=
      "\n\nNote: This is a mock response. Please configure your OpenRouter API key to get real AI responses.";

    return {
      text: response,
      model: modelId || "mock-model",
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const aiService = new AiService();
