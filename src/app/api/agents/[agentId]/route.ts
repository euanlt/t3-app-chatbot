import { NextRequest } from "next/server";
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { agentIntegrations } from "~/lib/agents/registry";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;

    // Parse agentId to extract integration and feature
    // Format: "pydantic-ai/agentic_chat" or just "agentic_chat"
    let integrationId = "pydantic-ai"; // default
    let featureId = agentId;

    if (agentId.includes("/")) {
      [integrationId, featureId] = agentId.split("/");
    }

    // Find the integration
    const integration = agentIntegrations.find((int) => int.id === integrationId);
    if (!integration) {
      return new Response(`Integration '${integrationId}' not found`, { status: 404 });
    }

    // Get agents for this integration
    const agents = await integration.agents();
    
    // Check if the specific feature agent exists
    if (!agents[featureId]) {
      return new Response(`Agent '${featureId}' not found in integration '${integrationId}'`, { 
        status: 404 
      });
    }

    // Create a runtime with the specific agent
    const runtime = new CopilotRuntime({
      agents: {
        [featureId]: agents[featureId],
      },
    });

    // Create the endpoint handler
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      endpoint: `/api/agents/${agentId}`,
    });

    return handleRequest(request);
  } catch (error) {
    console.error(`Error in agent API route:`, error);
    return new Response(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
}

export async function GET() {
  return new Response("Agent API endpoint - use POST to interact with agents", { status: 200 });
}