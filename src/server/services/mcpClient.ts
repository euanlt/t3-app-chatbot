import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createLogger } from "./logger";
import type { MCPServerConfig } from "../api/routers/mcp";

const logger = createLogger("MCPClient");

// Store active connections
const activeClients = new Map<string, MCPConnection>();

interface MCPConnection {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
}

export class MCPClientService {
  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<void> {
    logger.info("Connecting to MCP server", {
      id: config.id,
      name: config.name,
      transport: config.transport,
    });

    try {
      if (config.transport === "stdio") {
        await this.connectStdio(config);
      } else if (config.transport === "http") {
        // TODO: Implement HTTP transport
        throw new Error("HTTP transport not yet implemented");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Provide more specific error messages for common serverless issues
      let enhancedMessage = errorMessage;

      if (errorMessage.includes("ENOENT") && errorMessage.includes("mkdir")) {
        enhancedMessage = `Directory creation failed in serverless environment. This is likely due to read-only filesystem restrictions. Original error: ${errorMessage}`;
      } else if (errorMessage.includes("which: command not found")) {
        enhancedMessage = `Command 'which' not available in serverless environment. This has been handled with fallback logic. Original error: ${errorMessage}`;
      } else if (errorMessage.includes("npm error")) {
        enhancedMessage = `npm installation failed in serverless environment. This may be due to filesystem restrictions or missing dependencies. Consider pre-bundling MCP servers. Original error: ${errorMessage}`;
      } else if (
        errorMessage.includes("Connection closed") ||
        errorMessage.includes("-32000")
      ) {
        enhancedMessage = `MCP server connection failed. In serverless environments, this often indicates npm installation issues or missing dependencies. Check that all required environment variables are set and the MCP server package can be installed. Original error: ${errorMessage}`;
      }

      logger.error("Failed to connect to MCP server", {
        id: config.id,
        name: config.name,
        command: config.command,
        args: config.args,
        isServerless: !!(
          process.env.VERCEL ||
          process.env.NETLIFY ||
          process.env.AWS_LAMBDA_FUNCTION_NAME
        ),
        error: enhancedMessage,
        originalError: errorMessage,
      });

      const detailedError = new Error(enhancedMessage);
      // Preserve the original error as a property
      (detailedError as any).originalError = error;
      throw detailedError;
    }
  }

  /**
   * Validate environment for MCP server connection
   */
  private async validateEnvironment(config: MCPServerConfig): Promise<void> {
    // Check if required environment variables are set
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        if (!value || value.trim() === "") {
          throw new Error(
            `Environment variable ${key} is required but not set or empty`,
          );
        }
      }
    }

    // For Tavily specifically, ensure API key is present
    if (config.command === "npx" && config.args?.includes("tavily-mcp")) {
      const tavilyApiKey =
        config.env?.TAVILY_API_KEY || process.env.TAVILY_API_KEY;
      if (!tavilyApiKey || tavilyApiKey.trim() === "") {
        throw new Error(
          "TAVILY_API_KEY environment variable is required for Tavily MCP server",
        );
      }
    }

    // Check if we're in a serverless environment and warn about limitations
    const isServerless = !!(
      process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTION_NAME ||
      !process.env.HOME
    );

    if (isServerless) {
      logger.warn(
        "Running in serverless environment - some MCP features may be limited",
        {
          platform: process.env.VERCEL
            ? "Vercel"
            : process.env.NETLIFY
              ? "Netlify"
              : "Unknown serverless",
          serverId: config.id,
        },
      );
    }

    // Try to create necessary directories in serverless environment
    if (isServerless) {
      await this.ensureServerlessDirectories();
    }
  }

  /**
   * Ensure necessary directories exist in serverless environment
   */
  private async ensureServerlessDirectories(): Promise<void> {
    try {
      const fs = await import("fs");
      const path = await import("path");

      const dirs = [
        "/tmp/.npm-cache",
        "/tmp/.npm-global",
        "/tmp/.npm-global/lib",
        "/tmp/.npm-global/lib/node_modules",
        "/tmp/node_modules",
      ];

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.info("Created directory for serverless environment", { dir });
        }
      }

      // Also try to set proper permissions
      for (const dir of dirs) {
        try {
          fs.chmodSync(dir, 0o755);
        } catch (chmodError) {
          // Permission changes may fail in some serverless environments, but that's okay
          logger.debug("Could not set permissions for directory", { dir });
        }
      }
    } catch (error) {
      logger.warn("Could not create directories in serverless environment", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Connect to a stdio-based MCP server
   */
  private async connectStdio(config: MCPServerConfig): Promise<void> {
    if (!config.command) {
      throw new Error("Command is required for stdio transport");
    }

    // Validate environment before attempting connection
    await this.validateEnvironment(config);

    logger.info("Creating stdio transport", {
      id: config.id,
      command: config.command,
      args: config.args,
      argsLength: config.args?.length ?? 0,
      env: config.env ? Object.keys(config.env) : [],
    });

    // Try to find npx path if command is npx
    let finalCommand = config.command;
    if (config.command === "npx") {
      try {
        const { execSync } = await import("child_process");

        // Try command -v first (more portable than which)
        let npxPath = "";
        try {
          npxPath = execSync("command -v npx", { encoding: "utf8" }).trim();
          if (npxPath) {
            finalCommand = npxPath;
            logger.info("Found npx with 'command -v'", { path: npxPath });
          }
        } catch {
          // Fallback to which if command -v doesn't work
          try {
            npxPath = execSync("which npx", { encoding: "utf8" }).trim();
            if (npxPath) {
              finalCommand = npxPath;
              logger.info("Found npx with 'which'", { path: npxPath });
            }
          } catch (whichError) {
            logger.warn(
              "Could not find npx with 'which' or 'command -v', trying absolute paths",
              {
                error:
                  whichError instanceof Error
                    ? whichError.message
                    : "Unknown error",
              },
            );
          }
        }

        // If we still haven't found npx, try common locations
        if (finalCommand === "npx") {
          const commonPaths = [
            "/usr/local/bin/npx",
            "/usr/bin/npx",
            "/opt/homebrew/bin/npx",
            "/vercel/.local/bin/npx", // Vercel serverless environment
            "/opt/buildhome/.local/bin/npx", // Netlify build environment
            "C:\\Program Files\\nodejs\\npx.cmd",
            "C:\\nodejs\\npx.cmd",
          ];

          for (const path of commonPaths) {
            try {
              const fs = await import("fs");
              if (fs.existsSync(path)) {
                finalCommand = path;
                logger.info("Found npx at fallback path", { path });
                break;
              }
            } catch {
              // Continue to next path
            }
          }
        }
      } catch (error) {
        logger.warn("Error during npx path detection", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info("Final command for transport", {
      originalCommand: config.command,
      finalCommand,
      args: config.args,
      envVars: config.env ? Object.keys(config.env) : [],
    });

    // Validate environment variables
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        if (!value || value.trim() === "") {
          throw new Error(`Environment variable ${key} has empty value`);
        }
      }
    }

    // Detect serverless environment
    const isServerless = !!(
      process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTION_NAME || // Google Cloud Functions
      !process.env.HOME || // Often missing in serverless
      (process.env.NODE_ENV === "production" &&
        process.cwd().includes("/var/task"))
    );

    // Create merged environment variables
    // Include all of process.env plus our custom env vars
    const mergedEnv: Record<string, string> = {};

    // Copy process.env, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        mergedEnv[key] = value;
      }
    }

    // Add serverless-specific npm configuration
    if (isServerless) {
      logger.info(
        "Detected serverless environment, configuring npm for constrained environment",
      );

      // Configure npm to use writable directories
      mergedEnv.NPM_CONFIG_CACHE = "/tmp/.npm-cache";
      mergedEnv.NPM_CONFIG_PREFIX = "/tmp/.npm-global";
      mergedEnv.NPM_CONFIG_UPDATE_NOTIFIER = "false";
      mergedEnv.NPM_CONFIG_AUDIT = "false";
      mergedEnv.NPM_CONFIG_FUND = "false";
      mergedEnv.NPM_CONFIG_LOGLEVEL = "error";

      // Set a writable home directory fallback
      if (!mergedEnv.HOME || !mergedEnv.HOME.startsWith("/")) {
        mergedEnv.HOME = "/tmp";
      }

      // Ensure Node.js can find modules
      const existingNodePath = mergedEnv.NODE_PATH;
      mergedEnv.NODE_PATH = existingNodePath
        ? `${existingNodePath}:/tmp/node_modules:/tmp/.npm-global/lib/node_modules`
        : "/tmp/node_modules:/tmp/.npm-global/lib/node_modules";
    }

    // Add custom env vars (these can override serverless defaults if needed)
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        mergedEnv[key] = value;
      }
    }

    logger.info("Creating transport with environment", {
      command: finalCommand,
      args: config.args,
      customEnvVars: config.env ? Object.keys(config.env) : [],
      totalEnvVars: Object.keys(mergedEnv).length,
      // Log first few chars of each custom env var for debugging (without exposing full values)
      customEnvPreview: config.env
        ? Object.entries(config.env).map(
            ([k, v]) => `${k}=${v.substring(0, 5)}...`,
          )
        : [],
    });

    // Modify args for serverless environment if needed
    let finalArgs = config.args ?? [];

    // For npm/npx commands in serverless, add flags to reduce operations
    if (
      isServerless &&
      (finalCommand.includes("npx") || finalCommand.includes("npm"))
    ) {
      // Add serverless-friendly npm flags if not already present
      const serverlessFlags = ["--no-audit", "--no-fund", "--prefer-offline"];

      for (const flag of serverlessFlags) {
        if (!finalArgs.includes(flag)) {
          finalArgs.push(flag);
        }
      }

      logger.info("Added serverless-friendly npm flags", {
        originalArgs: config.args,
        finalArgs,
      });
    }

    // Create transport with proper environment variables
    // The env parameter should work if we include all of process.env
    const transport = new StdioClientTransport({
      command: finalCommand,
      args: finalArgs,
      env: mergedEnv,
    });

    // Create client
    const client = new Client(
      {
        name: `ai-chatbot-${config.id}`,
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    // Connect the client
    await client.connect(transport);

    // Store the connection
    activeClients.set(config.id, {
      client,
      transport,
      config,
    });

    logger.info("Successfully connected to MCP server", {
      id: config.id,
      name: config.name,
    });

    // Discover capabilities
    await this.discoverCapabilities(config.id);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = activeClients.get(serverId);
    if (!connection) {
      logger.warn("No active connection found", { serverId });
      return;
    }

    logger.info("Disconnecting from MCP server", { serverId });

    try {
      // Close the client (this will also terminate the transport)
      await connection.client.close();

      // Remove from active connections
      activeClients.delete(serverId);

      logger.info("Successfully disconnected from MCP server", { serverId });
    } catch (error) {
      logger.error("Error disconnecting from MCP server", {
        serverId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Discover server capabilities (tools, resources, prompts)
   */
  async discoverCapabilities(serverId: string): Promise<void> {
    const connection = activeClients.get(serverId);
    if (!connection) {
      throw new Error("Server not connected");
    }

    logger.info("Discovering server capabilities", { serverId });

    let tools: Array<{
      name: string;
      description: string;
      inputSchema?: unknown;
    }> = [];
    let resources: Array<{ uri: string; name: string; description?: string }> =
      [];
    let prompts: Array<{ name: string; description?: string }> = [];

    // Try to list tools
    try {
      logger.debug("Attempting to list tools", { serverId });
      const toolsResponse = await connection.client.listTools();
      tools = toolsResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      }));
      logger.info("Tools discovered", {
        serverId,
        count: tools.length,
        toolNames: tools.map((t) => t.name),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("-32601") ||
        errorMessage.includes("Method not found")
      ) {
        logger.info("Server does not implement listTools method", { serverId });
      } else {
        logger.error("Failed to list tools", { serverId, error: errorMessage });
      }
    }

    // Try to list resources
    try {
      const resourcesResponse = await connection.client.listResources();
      resources = resourcesResponse.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
      }));
      logger.info("Resources discovered", {
        serverId,
        count: resources.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("-32601") ||
        errorMessage.includes("Method not found")
      ) {
        logger.info("Server does not implement listResources method", {
          serverId,
        });
      } else {
        logger.error("Failed to list resources", {
          serverId,
          error: errorMessage,
        });
      }
    }

    // Try to list prompts
    try {
      const promptsResponse = await connection.client.listPrompts();
      prompts = promptsResponse.prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
      }));
      logger.info("Prompts discovered", { serverId, count: prompts.length });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("-32601") ||
        errorMessage.includes("Method not found")
      ) {
        logger.info("Server does not implement listPrompts method", {
          serverId,
        });
      } else {
        logger.error("Failed to list prompts", {
          serverId,
          error: errorMessage,
        });
      }
    }

    // Update the config with discovered capabilities
    connection.config.tools = tools;
    connection.config.resources = resources;
    connection.config.prompts = prompts;

    logger.info("Server capabilities discovery complete", {
      serverId,
      tools: tools.length,
      resources: resources.length,
      prompts: prompts.length,
    });
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const connection = activeClients.get(serverId);
    if (!connection) {
      throw new Error("Server not connected");
    }

    logger.info("Executing tool", {
      serverId,
      toolName,
      hasArgs: !!args,
      args: args ? JSON.stringify(args) : undefined,
    });

    try {
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args ?? {},
      });

      logger.info("Tool executed successfully", {
        serverId,
        toolName,
      });

      return result;
    } catch (error) {
      logger.error("Failed to execute tool", {
        serverId,
        toolName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get a resource from an MCP server
   */
  async getResource(serverId: string, uri: string): Promise<unknown> {
    const connection = activeClients.get(serverId);
    if (!connection) {
      throw new Error("Server not connected");
    }

    logger.info("Getting resource", {
      serverId,
      uri,
    });

    try {
      const result = await connection.client.readResource({ uri });

      logger.info("Resource retrieved successfully", {
        serverId,
        uri,
      });

      return result;
    } catch (error) {
      logger.error("Failed to get resource", {
        serverId,
        uri,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>,
  ): Promise<unknown> {
    const connection = activeClients.get(serverId);
    if (!connection) {
      throw new Error("Server not connected");
    }

    logger.info("Getting prompt", {
      serverId,
      promptName,
      hasArgs: !!args,
    });

    try {
      const result = await connection.client.getPrompt({
        name: promptName,
        arguments: args ?? {},
      });

      logger.info("Prompt retrieved successfully", {
        serverId,
        promptName,
      });

      return result;
    } catch (error) {
      logger.error("Failed to get prompt", {
        serverId,
        promptName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return activeClients.has(serverId);
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(activeClients.keys());
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Array<{
    serverId: string;
    serverName: string;
    tool: { name: string; description: string; inputSchema?: unknown };
  }> {
    const allTools: Array<{
      serverId: string;
      serverName: string;
      tool: { name: string; description: string; inputSchema?: unknown };
    }> = [];

    logger.debug("Getting all tools from active connections", {
      activeConnections: activeClients.size,
    });

    for (const [serverId, connection] of activeClients) {
      if (connection.config.tools) {
        logger.debug("Found tools for server", {
          serverId,
          serverName: connection.config.name,
          toolCount: connection.config.tools.length,
        });

        for (const tool of connection.config.tools) {
          allTools.push({
            serverId,
            serverName: connection.config.name,
            tool,
          });
        }
      }
    }

    logger.debug("Total tools available", {
      count: allTools.length,
      tools: allTools.map((t) => `${t.serverName}/${t.tool.name}`),
    });

    return allTools;
  }

  /**
   * Search for tools that match a query
   */
  searchTools(query: string): Array<{
    serverId: string;
    serverName: string;
    tool: { name: string; description: string; inputSchema?: unknown };
  }> {
    const lowerQuery = query.toLowerCase();
    const allTools = this.getAllTools();

    return allTools.filter(
      ({ tool }) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery),
    );
  }
}

// Export singleton instance
export const mcpClient = new MCPClientService();
