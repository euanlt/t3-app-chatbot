import { createLogger } from "./logger";
import { mcpClient } from "./mcpClient";

const logger = createLogger("MCPToolService");

interface ToolCall {
  serverId: string;
  serverName: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

interface ToolResult {
  toolCall: ToolCall;
  result?: unknown;
  error?: string;
}

export class MCPToolService {
  /**
   * Analyze user message and determine which MCP tools to use
   */
  async analyzeMessageForTools(message: string): Promise<ToolCall[]> {
    const toolCalls: ToolCall[] = [];
    const lowerMessage = message.toLowerCase();

    // Get all available tools
    const availableTools = mcpClient.getAllTools();

    logger.info("Analyzing message for tool usage", {
      messageLength: message.length,
      availableTools: availableTools.length,
    });

    // Simple keyword matching for now
    // In production, this would use the AI model to determine tool usage
    for (const { serverId, serverName, tool } of availableTools) {
      let shouldUseTool = false;
      const args: Record<string, unknown> = {};

      // Tavily search detection
      if (
        tool.name === "search" ||
        tool.name === "tavily_search" ||
        tool.name === "tavily-search"
      ) {
        if (
          lowerMessage.includes("search") ||
          lowerMessage.includes("find") ||
          lowerMessage.includes("look up") ||
          lowerMessage.includes("what is") ||
          lowerMessage.includes("who is") ||
          lowerMessage.includes("tell me about")
        ) {
          shouldUseTool = true;
          // Extract search query
          args.query = message
            .replace(/^(search|find|look up|what is|who is|tell me about)/i, "")
            .trim();
        }
      }

      // File system operations
      if (tool.name === "read_file" || tool.name === "list_directory") {
        if (
          lowerMessage.includes("read file") ||
          lowerMessage.includes("show file") ||
          lowerMessage.includes("list files") ||
          lowerMessage.includes("what files")
        ) {
          shouldUseTool = true;
          // Extract path from message
          const pathPattern = /['"](.*?)['"]/;
          const pathMatch = pathPattern.exec(message);
          if (pathMatch) {
            args.path = pathMatch[1];
          }
        }
      }

      // Git operations
      if (tool.name.includes("git")) {
        if (
          lowerMessage.includes("git") ||
          lowerMessage.includes("commit") ||
          lowerMessage.includes("branch") ||
          lowerMessage.includes("changes")
        ) {
          shouldUseTool = true;
        }
      }

      if (shouldUseTool) {
        toolCalls.push({
          serverId,
          serverName,
          toolName: tool.name,
          arguments: Object.keys(args).length > 0 ? args : undefined,
        });
      }
    }

    logger.info("Tool analysis complete", {
      message: message.substring(0, 50) + "...",
      toolCallsFound: toolCalls.length,
      tools: toolCalls.map((tc) => tc.toolName),
    });

    return toolCalls;
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    logger.info("Executing tool calls", { count: toolCalls.length });

    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        try {
          const result = await mcpClient.executeTool(
            toolCall.serverId,
            toolCall.toolName,
            toolCall.arguments,
          );

          logger.info("Tool executed successfully", {
            serverId: toolCall.serverId,
            toolName: toolCall.toolName,
          });

          return {
            toolCall,
            result,
          };
        } catch (error) {
          logger.error("Tool execution failed", {
            serverId: toolCall.serverId,
            toolName: toolCall.toolName,
            error: error instanceof Error ? error.message : "Unknown error",
          });

          return {
            toolCall,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    return results;
  }

  /**
   * Format tool results for inclusion in AI context
   */
  formatToolResults(results: ToolResult[]): string {
    if (results.length === 0) {
      return "";
    }

    const formatted = results.map(({ toolCall, result, error }) => {
      const header = `[${toolCall.serverName} - ${toolCall.toolName}]`;

      if (error) {
        return `${header} Error: ${error}`;
      }

      if (result) {
        // Format based on result type
        if (typeof result === "string") {
          return `${header}\n${result}`;
        } else if (typeof result === "object" && result !== null) {
          return `${header}\n${JSON.stringify(result, null, 2)}`;
        } else {
          return `${header}\n${result !== null && result !== undefined ? (typeof result === "string" ? result : JSON.stringify(result)) : "null"}`;
        }
      }

      return `${header} No result`;
    });

    return formatted.join("\n\n");
  }

  /**
   * Get tool recommendations based on user message
   */
  async getToolRecommendations(
    message: string,
  ): Promise<Array<{ tool: string; description: string; server: string }>> {
    const recommendations: Array<{
      tool: string;
      description: string;
      server: string;
    }> = [];
    const lowerMessage = message.toLowerCase();

    const availableTools = mcpClient.getAllTools();

    for (const { serverName, tool } of availableTools) {
      let relevanceScore = 0;

      // Check tool name relevance
      const toolNameWords = tool.name.toLowerCase().split(/[_\-\s]+/);
      for (const word of toolNameWords) {
        if (lowerMessage.includes(word)) {
          relevanceScore += 2;
        }
      }

      // Check description relevance
      if (tool.description) {
        const descWords = tool.description.toLowerCase().split(/\s+/);
        for (const word of descWords) {
          if (lowerMessage.includes(word) && word.length > 3) {
            relevanceScore += 1;
          }
        }
      }

      if (relevanceScore > 0) {
        recommendations.push({
          tool: tool.name,
          description: tool.description,
          server: serverName,
        });
      }
    }

    // Sort by relevance (implicit by order of discovery for now)
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}

// Export singleton
export const mcpToolService = new MCPToolService();
