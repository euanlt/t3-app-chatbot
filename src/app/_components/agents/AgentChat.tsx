"use client";

import { useEffect } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

interface AgentChatProps {
  agentId: string;
  agentName: string;
  endpoint: string;
}

// Client-side action handler for background color changes
function BackgroundColorHandler() {
  useCopilotAction({
    name: "set_background_color",
    description: "Change the background color of the application",
    parameters: [
      {
        name: "color",
        type: "string",
        description: "The color to set (name or hex code)"
      }
    ],
    handler: ({ color }) => {
      // Apply the background color
      document.body.style.backgroundColor = color;
      
      // Show visual feedback
      const notification = document.createElement("div");
      notification.className = "fixed top-4 right-4 bg-blue-100 border-blue-300 border p-4 rounded-lg shadow-lg z-50";
      notification.innerHTML = `🎨 Background color changed to: <span class="font-semibold">${color}</span>`;
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  });
  
  return null;
}

export default function AgentChat({ agentId, agentName }: AgentChatProps) {
  // Clean up background color on unmount
  useEffect(() => {
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      headers={{
        "x-agent-id": agentId
      }}
    >
      <BackgroundColorHandler />
      <div className="flex h-full flex-col">
        <div className="border-b border-primary bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">
            {agentName} - Powered by Pydantic AI
          </h2>
          <p className="text-sm text-secondary">
            {getAgentDescription(agentId)}
          </p>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <CopilotChat
            labels={{
              title: agentName,
              initial: `Hello! I'm ${agentName}. ${getAgentGreeting(agentId)}`
            }}
            className="h-full"
          />
        </div>
      </div>
    </CopilotKit>
  );
}

function getAgentDescription(agentId: string): string {
  const descriptions: Record<string, string> = {
    agentic_chat: "Chat with AI that can check time in any timezone and change background colors",
    human_in_the_loop: "Collaborative task planning with interactive approval workflows",
    agentic_generative_ui: "Long-running tasks with real-time progress visualization",
    tool_based_generative_ui: "Generate beautiful content like haikus, recipes, and code snippets",
    shared_state: "Collaborative recipe builder with real-time state synchronization",
    predictive_state_updates: "Real-time document editing with predictive text and diff visualization"
  };
  
  return descriptions[agentId] || "AI-powered assistant";
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