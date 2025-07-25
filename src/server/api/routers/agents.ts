import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { type HttpAgent } from "@ag-ui/client";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: "pydantic" | "custom";
  endpoint?: string;
  config?: Record<string, unknown>;
  status: "active" | "inactive" | "error";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store for now - will be replaced with database
const agentsStore = new Map<string, Agent>();

// Initialize with PydanticAI agents (Vercel serverless functions)
const pydanticAgents: Omit<Agent, "userId" | "createdAt" | "updatedAt">[] = [
  {
    id: "agentic_chat",
    name: "Agentic Chat",
    description: "Basic conversational agent with frontend tool integration. Can get current time in any timezone and change background colors.",
    type: "pydantic",
    endpoint: "/api/agents/agentic_chat",
    status: "inactive",
  },
  {
    id: "human_in_the_loop",
    name: "Human in the Loop",
    description: "Collaborative task planner that generates task steps and lets users decide which ones to perform.",
    type: "pydantic",
    endpoint: "/api/agents/human_in_the_loop",
    status: "inactive",
  },
  {
    id: "agentic_generative_ui",
    name: "Agentic Generative UI",
    description: "Real-time status updates for long-running tasks with live progress feedback and sequential step processing.",
    type: "pydantic",
    endpoint: "/api/agents/agentic_generative_ui",
    status: "inactive",
  },
  {
    id: "tool_based_generative_ui",
    name: "Tool Based Generative UI",
    description: "Generate and display structured content like haikus with elegant presentation and automatic UI rendering.",
    type: "pydantic",
    endpoint: "/api/agents/tool_based_generative_ui",
    status: "inactive",
  },
  {
    id: "shared_state",
    name: "Shared State",
    description: "Bidirectional state synchronization between UI and agent. Create recipes with real-time form controls and state updates.",
    type: "pydantic",
    endpoint: "/api/agents/shared_state",
    status: "inactive",
  },
  {
    id: "predictive_state_updates",
    name: "Predictive State Updates",
    description: "Real-time collaborative document editing with diff visualization and streaming character-by-character updates.",
    type: "pydantic",
    endpoint: "/api/agents/predictive_state_updates",
    status: "inactive",
  },
];

// Active agent instances
const activeAgents = new Map<string, HttpAgent>();

export const agentsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
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
    .query(async ({ input }) => {
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
      config: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
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
      config: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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