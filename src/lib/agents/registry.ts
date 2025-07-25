import { HttpAgent } from "@ag-ui/client";
import type { AgentIntegrationConfig, PydanticAIFeature } from "./types";

// Pydantic AI Agent Implementation
export class PydanticAIAgent extends HttpAgent {}

// Pydantic AI Integration Configuration
export const pydanticAIIntegration: AgentIntegrationConfig = {
  id: "pydantic-ai",
  name: "Pydantic AI",
  description: "Powerful AI agents with multiple capabilities including chat, UI generation, and workflow management",
  agents: async () => {
    const baseUrl = "http://localhost:9000";
    
    return {
      agentic_chat: new PydanticAIAgent({
        url: `${baseUrl}/agentic_chat/`,
      }),
      agentic_generative_ui: new PydanticAIAgent({
        url: `${baseUrl}/agentic_generative_ui/`,
      }),
      human_in_the_loop: new PydanticAIAgent({
        url: `${baseUrl}/human_in_the_loop/`,
      }),
      predictive_state_updates: new PydanticAIAgent({
        url: `${baseUrl}/predictive_state_updates/`,
      }),
      shared_state: new PydanticAIAgent({
        url: `${baseUrl}/shared_state/`,
      }),
      tool_based_generative_ui: new PydanticAIAgent({
        url: `${baseUrl}/tool_based_generative_ui/`,
      }),
    };
  },
  features: [
    {
      id: "agentic_chat",
      name: "Agentic Chat",
      description: "Basic conversational AI with integrated tools for time checking and UI control",
      enabled: true,
    },
    {
      id: "agentic_generative_ui",
      name: "Agentic Generative UI",
      description: "Long-running tasks with real-time progress updates and step-by-step execution",
      enabled: true,
    },
    {
      id: "human_in_the_loop",
      name: "Human in the Loop",
      description: "Interactive workflows requiring human approval and task review",
      enabled: true,
    },
    {
      id: "predictive_state_updates",
      name: "Predictive State Updates",
      description: "Optimistic UI updates with state prediction and document writing",
      enabled: true,
    },
    {
      id: "shared_state",
      name: "Shared State",
      description: "Bidirectional state synchronization for collaborative editing and recipe management",
      enabled: true,
    },
    {
      id: "tool_based_generative_ui",
      name: "Tool-Based Generative UI",
      description: "Custom rendering for tool outputs with bilingual haiku generation",
      enabled: true,
    },
  ],
};

// Agent Registry - Add more integrations here
export const agentIntegrations: AgentIntegrationConfig[] = [
  pydanticAIIntegration,
  // Future integrations: LangGraph, CrewAI, Mastra, etc.
];

// Helper functions
export function getIntegration(integrationId: string): AgentIntegrationConfig | undefined {
  return agentIntegrations.find((integration) => integration.id === integrationId);
}

export function getAvailableAgents(): Array<{
  integrationId: string;
  integrationName: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    endpoint: string;
  }>;
}> {
  return agentIntegrations.map((integration) => ({
    integrationId: integration.id,
    integrationName: integration.name,
    features: integration.features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      endpoint: `${integration.id}/${feature.id}`,
    })),
  }));
}

export function getAgentEndpoint(integrationId: string, featureId: string): string {
  return `/api/agents/${integrationId}/${featureId}`;
}