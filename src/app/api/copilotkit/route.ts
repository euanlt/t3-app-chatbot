import type { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { agentsIntegrations } from "~/lib/agents";

export async function POST(request: NextRequest) {
  // For now, we use the pydantic-ai integration
  const integration = agentsIntegrations[0];
  
  if (!integration) {
    return new Response("Integration not found", { status: 404 });
  }
  
  const agents = await integration.agents();
  
  const runtime = new CopilotRuntime({
    // @ts-expect-error - The types might not match exactly but this works
    agents,
  });
  
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: `/api/copilotkit`,
  });

  return handleRequest(request);
}