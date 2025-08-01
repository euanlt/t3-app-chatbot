"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

interface AgentChatProps {
  agentId: string;
  agentName: string;
  endpoint: string;
}

// Main chat component with background color support (matching dojo app pattern)
function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [background, setBackground] = useState<string>("--copilot-kit-background-color");
  
  useCopilotAction({
    name: "change_background",
    description: "Change the background color of the chat. Can be anything that the CSS background attribute accepts. Regular colors, linear or radial gradients etc.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background. Prefer gradients."
      }
    ],
    handler: ({ background }) => {
      setBackground(background);
      return {
        status: "success",
        message: `Background changed to ${background}`,
      };
    }
  });

  return (
    <div className="flex justify-center items-center h-full w-full" style={{ background }}>
      <div className="w-4/5 h-4/5 rounded-lg">
        <CopilotChat
          className="h-full rounded-2xl"
          labels={{
            title: agentName,
            initial: `Hello! I'm ${agentName}. ${getAgentGreeting(agentId)}`
          }}
        />
      </div>
    </div>
  );
}

export default function AgentChat({ agentId, agentName }: AgentChatProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <Chat agentId={agentId} agentName={agentName} />
    </CopilotKit>
  );
}


function getAgentGreeting(agentId: string): string {
  const greetings: Record<string, string> = {
    agentic_chat: "I can help you check the time in different timezones or change the background color. Try asking me 'What time is it in Tokyo?' or 'Change the background to blue'!",
    human_in_the_loop: "I can help you break down complex tasks into manageable steps. Tell me about a project you're working on!",
    agentic_generative_ui: "I can help with long-running tasks and show you real-time progress. Ask me to deploy an app or analyze some data!",
    tool_based_generative_ui: "I can create beautiful content for you. Ask me to write a haiku, generate a recipe, or create a code snippet!",
    shared_state: "Let's build a recipe together! Tell me what kind of dish you'd like to make.",
    predictive_state_updates: "I can help you write documents with real-time collaboration. Start by telling me what you'd like to write!"
  };
  
  return greetings[agentId] || "How can I help you today?";
}