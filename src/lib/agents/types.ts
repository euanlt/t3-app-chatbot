import type { AbstractAgent } from "@ag-ui/client";

export interface Agent {
  id: string;
  name: string;
  description?: string;
  endpoint?: string;
  features?: AgentFeature[];
}

export interface AgentFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentIntegrationConfig {
  id: string;
  name: string;
  description: string;
  agents: () => Promise<Record<string, AbstractAgent>>;
  features: AgentFeature[];
}

export type PydanticAIFeature =
  | "agentic_chat"
  | "agentic_generative_ui"
  | "human_in_the_loop"
  | "predictive_state_updates"
  | "shared_state"
  | "tool_based_generative_ui";

export interface AgentState {
  steps?: Array<{
    description: string;
    status: "pending" | "completed" | "executing";
  }>;
}

export interface RecipeAgentState {
  recipe: {
    title: string;
    description: string;
    ingredients: Array<{
      id: string;
      name: string;
      amount: string;
    }>;
    instructions: Array<{
      id: string;
      step: string;
    }>;
  };
}

export interface StepsFeedbackArgs {
  steps: Array<{
    description: string;
    status: "enabled" | "disabled" | "executing";
  }>;
}

export interface HaikuArgs {
  japanese: string[];
  english: string[];
}