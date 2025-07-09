import { createLogger } from "./logger";
import { mcpClient } from "./mcpClient";
import type { ChatMessage } from "./aiService";

const logger = createLogger("AIToolIntegration");

interface ToolDecision {
  shouldUseTool: boolean;
  toolName: string;
  serverId: string;
  serverName: string;
  arguments: Record<string, unknown>;
  reasoning: string;
}

interface ToolExecutionResult {
  toolName: string;
  serverName: string;
  serverId: string;
  success: boolean;
  executionTime?: number;
  error?: string;
  result?: unknown;
}

export class AIToolIntegration {
  /**
   * Create a prompt for the AI to decide which tools to use
   */
  private createToolDecisionPrompt(
    userMessage: string,
    availableTools: Array<{ serverId: string; serverName: string; tool: { name: string; description: string; inputSchema?: unknown } }>
  ): string {
    const toolDescriptions = availableTools.map(({ serverName, tool }) => 
      `- ${serverName}/${tool.name}: ${tool.description}${tool.inputSchema ? '\n  Schema: ' + JSON.stringify(tool.inputSchema) : ''}`
    ).join('\n');
    
    return `You are an AI assistant with access to external tools via MCP (Model Context Protocol).

Available tools:
${toolDescriptions}

User message: "${userMessage}"

Based on the user's message, determine which tools (if any) should be used to provide a complete answer.
For each tool you want to use, provide:
1. The exact tool name
2. The server name it belongs to
3. The arguments to pass (matching the schema)
4. Your reasoning for using this tool

Respond in JSON format like:
{
  "tools": [
    {
      "toolName": "search",
      "serverName": "Tavily",
      "arguments": { "query": "..." },
      "reasoning": "User is asking about..."
    }
  ]
}

If no tools are needed, respond with:
{
  "tools": [],
  "reasoning": "The user's question can be answered without external tools"
}`;
  }
  
  /**
   * Use AI to determine which tools to use for a message
   */
  async determineToolUsage(
    userMessage: string,
    modelId: string
  ): Promise<ToolDecision[]> {
    try {
      const availableTools = mcpClient.getAllTools();
      
      if (availableTools.length === 0) {
        logger.info("No MCP tools available");
        return [];
      }
      
      logger.info("Available MCP tools for analysis", {
        count: availableTools.length,
        tools: availableTools.map(t => `${t.serverName}/${t.tool.name}`)
      });
      
      // For now, use simple keyword matching
      // In production, this would call the AI model
      const decisions: ToolDecision[] = [];
      const lowerMessage = userMessage.toLowerCase();
      
      for (const { serverId, serverName, tool } of availableTools) {
        // Tavily search
        if (tool.name === "tavily_search" || tool.name === "search" || tool.name === "tavily-search") {
          if (
            lowerMessage.includes("search for") ||
            lowerMessage.includes("find information about") ||
            lowerMessage.includes("look up") ||
            lowerMessage.includes("what is") ||
            lowerMessage.includes("who is") ||
            lowerMessage.includes("tell me about") ||
            lowerMessage.includes("latest news") ||
            lowerMessage.includes("current") ||
            lowerMessage.includes("recent")
          ) {
            // Extract search query
            let query = userMessage;
            const patterns = [
              /search for (.+)/i,
              /find information about (.+)/i,
              /look up (.+)/i,
              /what is (.+?)\??$/i,
              /who is (.+?)\??$/i,
              /tell me about (.+)/i,
              /latest news about (.+)/i,
              /current (.+)/i,
              /recent (.+)/i
            ];
            
            for (const pattern of patterns) {
              const match = userMessage.match(pattern);
              if (match?.[1]) {
                query = match[1].trim().replace(/\?+$/, ''); // Remove trailing question marks
                break;
              }
            }
            
            // If no pattern matched, use the whole message as query
            if (query === userMessage && query.length > 100) {
              // For long messages, extract key terms
              query = userMessage.substring(0, 100) + "...";
            }
            
            logger.info("Preparing Tavily search", {
              originalMessage: userMessage.substring(0, 50) + "...",
              extractedQuery: query,
              toolName: tool.name
            });
            
            decisions.push({
              shouldUseTool: true,
              toolName: tool.name,
              serverId,
              serverName,
              arguments: { query },
              reasoning: "User is asking for information that requires web search"
            });
          }
        }
        
        // File operations
        if (tool.name === "read_file" || tool.name === "list_files") {
          if (
            lowerMessage.includes("read file") ||
            lowerMessage.includes("show file") ||
            lowerMessage.includes("open file") ||
            lowerMessage.includes("list files") ||
            lowerMessage.includes("show files")
          ) {
            const pathMatch = userMessage.match(/["']([^"']+)["']/);
            const args: Record<string, unknown> = {};
            
            if (pathMatch) {
              args.path = pathMatch[1];
            }
            
            decisions.push({
              shouldUseTool: true,
              toolName: tool.name,
              serverId,
              serverName,
              arguments: args,
              reasoning: "User is asking for file system operations"
            });
          }
        }
      }
      
      logger.info("Tool usage analysis complete", {
        messagePreview: userMessage.substring(0, 50) + "...",
        decisionsCount: decisions.length,
        tools: decisions.map(d => `${d.serverName}/${d.toolName}`)
      });
      
      return decisions;
    } catch (error) {
      logger.error("Failed to determine tool usage", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return [];
    }
  }
  
  /**
   * Execute tool decisions and format results with tracking
   */
  async executeToolDecisionsWithTracking(decisions: ToolDecision[]): Promise<{ results: ToolExecutionResult[], formattedResults: string }> {
    if (decisions.length === 0) {
      return { results: [], formattedResults: "" };
    }

    logger.info("Executing tool decisions with tracking", { count: decisions.length });

    const results = await Promise.all(
      decisions.map(async (decision) => {
        const startTime = Date.now();
        try {
          logger.info("Executing tool", {
            server: decision.serverName,
            tool: decision.toolName,
            args: decision.arguments
          });

          const result = await mcpClient.executeTool(
            decision.serverId,
            decision.toolName,
            decision.arguments
          );

          const executionTime = Date.now() - startTime;

          return {
            toolName: decision.toolName,
            serverName: decision.serverName,
            serverId: decision.serverId,
            success: true,
            executionTime,
            result
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;
          logger.error("Tool execution failed", {
            server: decision.serverName,
            tool: decision.toolName,
            error: error instanceof Error ? error.message : "Unknown error"
          });

          return {
            toolName: decision.toolName,
            serverName: decision.serverName,
            serverId: decision.serverId,
            success: false,
            executionTime,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      })
    );

    // Format results for AI context
    const formattedResults = this.formatResultsForAI(results);

    logger.info("Tool execution with tracking complete", {
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });

    return { results, formattedResults };
  }

  /**
   * Execute tool decisions and format results (legacy method)
   */
  async executeToolDecisions(decisions: ToolDecision[]): Promise<string> {
    const { formattedResults } = await this.executeToolDecisionsWithTracking(decisions);
    return formattedResults;
  }

  /**
   * Format results for AI context
   */
  private formatResultsForAI(results: ToolExecutionResult[]): string {
    if (results.length === 0) {
      return "";
    }
    
    const formattedResults = results.map(r => {
      if (r.success) {
        let resultStr = "";
        if (typeof r.result === "string") {
          resultStr = r.result;
        } else if (r.result && typeof r.result === "object") {
          // Handle different result formats
          const res = r.result as any;
          if (res.content) {
            resultStr = Array.isArray(res.content) 
              ? res.content.map((c: any) => c.text || JSON.stringify(c)).join("\n")
              : res.content;
          } else {
            resultStr = JSON.stringify(r.result, null, 2);
          }
        }
        
        // Add timestamp and clear labeling for search results
        const timestamp = new Date().toLocaleString();
        let header = `[${r.serverName}/${r.toolName} - Success]`;
        
        // Special formatting for search tools
        if (r.toolName.toLowerCase().includes('search') || r.toolName.toLowerCase().includes('tavily')) {
          header = `🔍 LIVE WEB SEARCH RESULTS`;
          return `${header}\nSource: ${r.serverName} (Retrieved: ${timestamp})\n\n${resultStr}`;
        }
        
        return `${header}\n${resultStr}`;
      } else {
        return `[${r.serverName}/${r.toolName} - Error]\n${r.error}`;
      }
    }).join("\n\n---\n\n");
    
    return formattedResults;
  }
  
  /**
   * Create an enhanced system prompt that includes tool results
   */
  createEnhancedSystemPrompt(basePrompt: string, toolResults: string): string {
    if (!toolResults) {
      return basePrompt;
    }
    
    return `${basePrompt}

You have access to external tools via MCP (Model Context Protocol). The following tool results are available to help answer the user's question:

${toolResults}

Please incorporate these tool results naturally into your response. If the tools provided relevant information, use it to give a more accurate and complete answer.`;
  }
}

// Export singleton
export const aiToolIntegration = new AIToolIntegration();