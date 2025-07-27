import { NextRequest } from "next/server";
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

export async function POST(request: NextRequest) {
  // Get the agent from the request headers or query params
  const agentId = request.headers.get("x-agent-id") || "agentic_chat";
  
  // Map agent IDs to their Python backend URLs
  const agentUrls: Record<string, string> = {
    "agentic_chat": "http://localhost:9000/agentic_chat",
    "human_in_the_loop": "http://localhost:9000/human_in_the_loop",
    "agentic_generative_ui": "http://localhost:9000/agentic_generative_ui",
    "tool_based_generative_ui": "http://localhost:9000/tool_based_generative_ui",
    "shared_state": "http://localhost:9000/shared_state",
    "predictive_state_updates": "http://localhost:9000/predictive_state_updates"
  };
  
  const agentUrl = agentUrls[agentId] || agentUrls.agentic_chat;
  
  // Create a runtime for the specific agent
  const runtime = new CopilotRuntime({
    remoteActions: [
      {
        url: agentUrl
      }
    ]
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit"
  });

  return handleRequest(request);
}