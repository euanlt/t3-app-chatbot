import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { type HttpAgent } from "@ag-ui/client";

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["pydantic", "custom"]),
  endpoint: z.string().optional(),
  config: z.record(z.any()).optional(),
  status: z.enum(["active", "inactive", "error"]),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Agent = z.infer<typeof agentSchema>;

// In-memory store for now - will be replaced with database
const agentsStore = new Map<string, Agent>();

// Initialize with PydanticAI agents (Vercel serverless functions)
const pydanticAgents: Omit<Agent, "userId" | "createdAt" | "updatedAt">[] = [
  {
    id: "agentic-chat",
    name: "Agentic Chat",
    description: "Basic chat agent with tool capabilities",
    type: "pydantic",
    endpoint: "/api/agents/agentic_chat",
    status: "inactive",
  },
  {
    id: "weather-chat",
    name: "Weather Chat",
    description: "Chat agent that can provide weather information",
    type: "pydantic",
    endpoint: "/api/agents/weather_chat",
    status: "inactive",
  },
  // Note: Other agents will be added as we implement them
  // {
  //   id: "agentic-generative-ui",
  //   name: "Agentic Generative UI", 
  //   description: "Agent that generates UI components",
  //   type: "pydantic",
  //   endpoint: "/api/agents/agentic_generative_ui",
  //   status: "inactive",
  // },
];

// Active agent instances
const activeAgents = new Map<string, HttpAgent>();

export const agentsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const userId = "default-user";
    
    // Add PydanticAI agents for all users
    const allAgents = [...pydanticAgents.map(agent => ({
      ...agent,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))];
    
    // Add user's custom agents
    agentsStore.forEach(agent => {
      if (agent.userId === userId && agent.type === "custom") {
        allAgents.push(agent);
      }
    });
    
    return allAgents;
  }),

  get: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = "default-user";
      
      // Check if it's a PydanticAI agent
      const pydanticAgent = pydanticAgents.find(a => a.id === input.id);
      if (pydanticAgent) {
        return {
          ...pydanticAgent,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      // Check custom agents
      const agent = agentsStore.get(input.id);
      if (!agent || agent.userId !== userId) {
        throw new Error("Agent not found");
      }
      
      return agent;
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      endpoint: z.string().url(),
      config: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent: Agent = {
        id: `custom-${Date.now()}`,
        name: input.name,
        description: input.description,
        type: "custom",
        endpoint: input.endpoint,
        config: input.config,
        status: "inactive",
        userId: "default-user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      agentsStore.set(agent.id, agent);
      return agent;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      endpoint: z.string().url().optional(),
      config: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = agentsStore.get(input.id);
      if (!agent || agent.userId !== "default-user") {
        throw new Error("Agent not found");
      }
      
      if (agent.type !== "custom") {
        throw new Error("Cannot update built-in agents");
      }
      
      const updatedAgent = {
        ...agent,
        name: input.name ?? agent.name,
        description: input.description ?? agent.description,
        endpoint: input.endpoint ?? agent.endpoint,
        config: input.config ?? agent.config,
        updatedAt: new Date(),
      };
      
      agentsStore.set(agent.id, updatedAgent);
      return updatedAgent;
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = agentsStore.get(input.id);
      if (!agent || agent.userId !== "default-user") {
        throw new Error("Agent not found");
      }
      
      if (agent.type !== "custom") {
        throw new Error("Cannot delete built-in agents");
      }
      
      // Stop agent if active
      if (activeAgents.has(input.id)) {
        activeAgents.delete(input.id);
      }
      
      agentsStore.delete(input.id);
      return { success: true };
    }),

  start: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = "default-user";
      
      // Get agent
      let agent: Agent | undefined;
      const pydanticAgent = pydanticAgents.find(a => a.id === input.id);
      if (pydanticAgent) {
        agent = {
          ...pydanticAgent,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        agent = agentsStore.get(input.id);
        if (!agent || agent.userId !== userId) {
          throw new Error("Agent not found");
        }
      }
      
      if (!agent.endpoint) {
        throw new Error("Agent endpoint not configured");
      }
      
      // TODO: Create HttpAgent instance
      // const httpAgent = new HttpAgent({ url: agent.endpoint });
      // activeAgents.set(agent.id, httpAgent);
      
      // Update status
      agent.status = "active";
      if (agent.type === "custom") {
        agentsStore.set(agent.id, agent);
      }
      
      return { success: true };
    }),

  stop: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = "default-user";
      
      // Get agent
      let agent: Agent | undefined;
      const pydanticAgent = pydanticAgents.find(a => a.id === input.id);
      if (pydanticAgent) {
        agent = {
          ...pydanticAgent,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        agent = agentsStore.get(input.id);
        if (!agent || agent.userId !== userId) {
          throw new Error("Agent not found");
        }
      }
      
      // Stop agent
      if (activeAgents.has(agent.id)) {
        activeAgents.delete(agent.id);
      }
      
      // Update status
      agent.status = "inactive";
      if (agent.type === "custom") {
        agentsStore.set(agent.id, agent);
      }
      
      return { success: true };
    }),
});