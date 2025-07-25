"use client";

import React, { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import AgenticChatFeature from "./features/AgenticChatFeature";
import AgenticGenerativeUIFeature from "./features/AgenticGenerativeUIFeature";
import HumanInTheLoopFeature from "./features/HumanInTheLoopFeature";
import ToolBasedGenerativeUIFeature from "./features/ToolBasedGenerativeUIFeature";
import PredictiveStateUpdatesFeature from "./features/PredictiveStateUpdatesFeature";
import SharedStateFeature from "./features/SharedStateFeature";

interface EnhancedAgentChatProps {
  agentId: string;
  agentName: string;
  endpoint: string;
  feature?: string;
}

export default function EnhancedAgentChat({ 
  agentId, 
  agentName, 
  endpoint,
  feature = "agentic_chat" 
}: EnhancedAgentChatProps) {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Connection Status */}
      <div className="border-primary border-b p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-primary text-lg font-semibold">{agentName}</h2>
            <p className="text-secondary text-sm">{feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-500' : 'text-yellow-500'}`}>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <CopilotKit
          runtimeUrl={endpoint}
          agent={feature}
          showDevConsole={process.env.NODE_ENV === 'development'}
          onConnect={() => setIsConnected(true)}
          onDisconnect={() => setIsConnected(false)}
        >
          <AgentChatContent feature={feature} />
        </CopilotKit>
      </div>
    </div>
  );
}

function AgentChatContent({ feature }: { feature: string }) {
  switch (feature) {
    case "agentic_chat":
      return <AgenticChatFeature />;
    case "agentic_generative_ui":
      return <AgenticGenerativeUIFeature />;
    case "human_in_the_loop":
      return <HumanInTheLoopFeature />;
    case "predictive_state_updates":
      return <PredictiveStateUpdatesFeature />;
    case "shared_state":
      return <SharedStateFeature />;
    case "tool_based_generative_ui":
      return <ToolBasedGenerativeUIFeature />;
    default:
      return <BasicChatFeature />;
  }
}

function BasicChatFeature() {
  return (
    <div className="h-full">
      <CopilotChat
        className="h-full"
        labels={{
          initial: "Hi! I'm an AG-UI agent. How can I help you today?",
          placeholder: "Ask me anything...",
        }}
      />
    </div>
  );
}

function AgenticChatFeature() {
  const [background, setBackground] = useState<string>("transparent");

  return (
    <div className="h-full" style={{ background }}>
      <div className="h-full p-4">
        <CopilotChat
          className="h-full rounded-2xl"
          labels={{
            initial: "Hi, I'm an agent. Want to chat? I can check time in different zones and change the background!",
            placeholder: "Try: 'What time is it in New York?' or 'Change background to blue gradient'",
          }}
        />
      </div>
    </div>
  );
}

function AgenticGenerativeUIFeature() {
  return (
    <div className="h-full p-4">
      <CopilotChat
        className="h-full rounded-2xl"
        labels={{
          initial: "Hi! I can help you with long-running tasks and show real-time progress. Try asking me to create a plan for something!",
          placeholder: "Try: 'Create a plan for organizing my workspace'",
        }}
      />
    </div>
  );
}

function HumanInTheLoopFeature() {
  return (
    <div className="h-full p-4">
      <CopilotChat
        className="h-full rounded-2xl"
        labels={{
          initial: "Hi, I'm an agent specialized in helping you with your tasks. I'll create task lists for your review. How can I help you?",
          placeholder: "Try: 'Generate a list of steps for cleaning a car'",
        }}
      />
    </div>
  );
}

function PredictiveStateUpdatesFeature() {
  return (
    <div className="h-full p-4">
      <CopilotChat
        className="h-full rounded-2xl"
        labels={{
          initial: "I can help with document writing and predictive state updates. What would you like to work on?",
          placeholder: "Try: 'Help me write a story about space exploration'",
        }}
      />
    </div>
  );
}

function SharedStateFeature() {
  return (
    <div className="h-full p-4">
      <CopilotChat
        className="h-full rounded-2xl"
        labels={{
          initial: "I can help you create and modify recipes with real-time collaboration. What recipe would you like to work on?",
          placeholder: "Try: 'Help me create a chocolate cake recipe'",
        }}
      />
    </div>
  );
}

function ToolBasedGenerativeUIFeature() {
  return (
    <div className="h-full p-4">
      <CopilotChat
        className="h-full rounded-2xl"
        labels={{
          initial: "I can generate beautiful haikus in both English and Japanese. What would you like a haiku about?",
          placeholder: "Try: 'Generate a haiku about cherry blossoms'",
        }}
      />
    </div>
  );
}