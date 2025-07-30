import { HttpAgent } from "@ag-ui/client";

export interface AgentIntegrationConfig {
  id: string;
  agents: () => Promise<Record<string, HttpAgent>>;
}

// Helper function to get the correct agent URL based on environment
const getAgentUrl = (agentName: string): string => {
  // In development, use the Python backend directly if configured
  const backendUrl = process.env.NEXT_PUBLIC_AGENT_BACKEND_URL;
  
  if (backendUrl) {
    // Local development with Python backend
    return `${backendUrl}/${agentName}`;
  }
  
  // Production or local without Python backend - use Next.js API routes
  return `/api/agents/${agentName}`;
};

export const agentsIntegrations: AgentIntegrationConfig[] = [
  {
    id: "pydantic-ai",
    agents: async () => ({
      agentic_chat: new HttpAgent({
        url: getAgentUrl("agentic_chat")
      }),
      human_in_the_loop: new HttpAgent({
        url: getAgentUrl("human_in_the_loop")
      }),
      agentic_generative_ui: new HttpAgent({
        url: getAgentUrl("agentic_generative_ui")
      }),
      tool_based_generative_ui: new HttpAgent({
        url: getAgentUrl("tool_based_generative_ui")
      }),
      shared_state: new HttpAgent({
        url: getAgentUrl("shared_state")
      }),
      predictive_state_updates: new HttpAgent({
        url: getAgentUrl("predictive_state_updates")
      }),
    })
  }
];