import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { mcpClient } from "~/server/services/mcpClient";
import { TRPCError } from "@trpc/server";

const logger = createLogger("MCPRouter");

// MCP Server configuration schema
export const mcpServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  transport: z.enum(["stdio", "http"]),
  // For stdio transport
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  // For http transport
  url: z.string().optional(),
  // Authentication
  auth: z
    .object({
      type: z.enum(["none", "bearer", "oauth"]),
      token: z.string().optional(),
    })
    .optional(),
  // Runtime status
  status: z.enum(["active", "inactive", "error", "starting", "stopping"]),
  // Discovered capabilities
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        inputSchema: z.any(),
      }),
    )
    .optional(),
  resources: z
    .array(
      z.object({
        uri: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  prompts: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MCPServerConfig = z.infer<typeof mcpServerConfigSchema>;

// In-memory storage for user-configured servers (will be replaced with DB later)
const userServers = new Map<string, MCPServerConfig>();

export const mcpRouter = createTRPCRouter({
  // Get all user-configured servers
  getUserServers: publicProcedure.query(async () => {
    logger.info("Fetching user MCP servers");

    const servers = Array.from(userServers.values());

    return {
      servers,
      total: servers.length,
    };
  }),

  // Add a new server configuration
  addServer: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        transport: z.enum(["stdio", "http"]),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        url: z.string().optional(),
        auth: z
          .object({
            type: z.enum(["none", "bearer", "oauth"]),
            token: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Adding new MCP server", {
        name: input.name,
        command: input.command,
        args: input.args,
        argsLength: input.args?.length ?? 0,
        transport: input.transport,
      });

      const id = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newServer: MCPServerConfig = {
        id,
        ...input,
        status: "inactive",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userServers.set(id, newServer);

      return newServer;
    }),

  // Update server configuration
  updateServer: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        url: z.string().optional(),
        auth: z
          .object({
            type: z.enum(["none", "bearer", "oauth"]),
            token: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Updating MCP server", { id: input.id });

      const server = userServers.get(input.id);

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      const updatedServer = {
        ...server,
        ...input,
        updatedAt: new Date(),
      };

      userServers.set(input.id, updatedServer);

      return updatedServer;
    }),

  // Delete server configuration
  deleteServer: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Deleting MCP server", { id: input.id });

      if (!userServers.has(input.id)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      userServers.delete(input.id);

      return { success: true };
    }),

  // Get server status
  getServerStatus: publicProcedure
    .input(
      z.object({
        serverId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching MCP server status", { serverId: input.serverId });

      const server = userServers.get(input.serverId);

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      return {
        serverId: server.id,
        status: server.status,
        tools: server.tools ?? [],
        resources: server.resources ?? [],
        prompts: server.prompts ?? [],
        lastChecked: new Date(),
      };
    }),

  // Start server
  startServer: publicProcedure
    .input(
      z.object({
        serverId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Starting MCP server", { serverId: input.serverId });

      const server = userServers.get(input.serverId);

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      // Update status
      server.status = "starting";
      server.updatedAt = new Date();
      userServers.set(input.serverId, server);

      try {
        // Connect to the MCP server
        await mcpClient.connect(server);

        // Update status to active
        server.status = "active";
        server.updatedAt = new Date();

        // Get discovered capabilities and sync them
        const connection = mcpClient.isConnected(input.serverId);
        if (connection) {
          // Get the tools from the mcpClient connection
          const allTools = mcpClient.getAllTools();
          const serverTools = allTools
            .filter((t) => t.serverId === input.serverId)
            .map((t) => t.tool);

          // Update server with discovered tools
          server.tools = serverTools;

          logger.info("Server started successfully with tools", {
            serverId: input.serverId,
            tools: server.tools?.length ?? 0,
            toolNames: server.tools?.map((t) => t.name) ?? [],
            resources: server.resources?.length ?? 0,
          });
        }

        userServers.set(input.serverId, server);
      } catch (error) {
        // Update status to error
        server.status = "error";
        server.updatedAt = new Date();
        userServers.set(input.serverId, server);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start server: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      return {
        success: true,
        message: `Starting ${server.name}...`,
        serverId: server.id,
      };
    }),

  // Stop server
  stopServer: publicProcedure
    .input(
      z.object({
        serverId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Stopping MCP server", { serverId: input.serverId });

      const server = userServers.get(input.serverId);

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      // Update status
      server.status = "stopping";
      server.updatedAt = new Date();
      userServers.set(input.serverId, server);

      try {
        // Disconnect from the MCP server
        await mcpClient.disconnect(input.serverId);

        // Update status to inactive
        server.status = "inactive";
        server.updatedAt = new Date();

        // Clear capabilities
        server.tools = undefined;
        server.resources = undefined;
        server.prompts = undefined;

        userServers.set(input.serverId, server);
      } catch (error) {
        logger.error("Error stopping server", {
          serverId: input.serverId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Still set to inactive even if error
        server.status = "inactive";
        server.updatedAt = new Date();
        userServers.set(input.serverId, server);
      }

      return {
        success: true,
        message: `Stopping ${server.name}...`,
        serverId: server.id,
      };
    }),

  // Execute tool
  executeTool: publicProcedure
    .input(
      z.object({
        serverId: z.string(),
        toolName: z.string(),
        arguments: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Executing MCP tool", {
        serverId: input.serverId,
        toolName: input.toolName,
      });

      const server = userServers.get(input.serverId);

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }

      if (server.status !== "active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "MCP server is not active",
        });
      }

      try {
        // Execute the tool using MCP client
        const result = await mcpClient.executeTool(
          input.serverId,
          input.toolName,
          input.arguments,
        );

        return {
          success: true,
          result: {
            toolName: input.toolName,
            response: result,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to execute tool: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get all active tools from all servers
  getActiveTools: publicProcedure.query(async () => {
    logger.info("Fetching active MCP tools");

    const activeServers = Array.from(userServers.values()).filter(
      (s) => s.status === "active",
    );

    const allTools = activeServers.flatMap((server) =>
      (server.tools ?? []).map((tool) => ({
        ...tool,
        serverId: server.id,
        serverName: server.name,
      })),
    );

    return {
      servers: activeServers,
      tools: allTools,
    };
  }),

  // Get resource from a server
  getResource: publicProcedure
    .input(
      z.object({
        serverId: z.string(),
        uri: z.string(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Getting resource", {
        serverId: input.serverId,
        uri: input.uri,
      });

      try {
        const result = await mcpClient.getResource(input.serverId, input.uri);
        logger.info("Fetched resource", {
          serverId: input.serverId,
          uri: input.uri,
        });
        return result;
      } catch (error) {
        logger.error("Failed to get resource", {
          serverId: input.serverId,
          uri: input.uri,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to get resource",
        });
      }
    }),

  // Get all available tools from connected servers
  getAvailableTools: publicProcedure.query(async () => {
    try {
      const tools = mcpClient.getAllTools();
      logger.info("Retrieved available tools", { count: tools.length });
      return tools;
    } catch (error) {
      logger.error("Failed to get available tools", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get available tools",
      });
    }
  }),

  // Search tools by query
  searchTools: publicProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const tools = mcpClient.searchTools(input.query);
        logger.info("Searched tools", {
          query: input.query,
          count: tools.length,
        });
        return tools;
      } catch (error) {
        logger.error("Failed to search tools", {
          query: input.query,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search tools",
        });
      }
    }),
});
