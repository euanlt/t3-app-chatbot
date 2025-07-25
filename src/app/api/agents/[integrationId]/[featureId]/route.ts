import { NextRequest } from "next/server";
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { getIntegration } from "~/lib/agents/registry";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string; featureId: string }> }
) {
  try {
    const { integrationId, featureId } = await context.params;

    // Get the integration configuration
    const integration = getIntegration(integrationId);
    if (!integration) {
      return new Response(`Integration '${integrationId}' not found`, { status: 404 });
    }

    // Get all agents for this integration
    const agents = await integration.agents();
    
    // Check if the specific feature agent exists
    if (!agents[featureId]) {
      return new Response(`Feature '${featureId}' not found in integration '${integrationId}'`, { 
        status: 404 
      });
    }

    // Create a runtime with just the specific agent for this feature
    const runtime = new CopilotRuntime({
      agents: {
        [featureId]: agents[featureId],
      },
    });

    // Create the endpoint handler
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      endpoint: `/api/agents/${integrationId}/${featureId}`,
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