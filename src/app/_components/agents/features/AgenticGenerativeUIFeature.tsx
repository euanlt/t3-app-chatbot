"use client";

import React from "react";
import { CopilotChat, useCoAgentStateRender } from "@copilotkit/react-ui";
import { FaSpinner, FaCheck } from "react-icons/fa";
import type { AgentState } from "~/lib/agents/types";

export default function AgenticGenerativeUIFeature() {
  // Render agent state updates with progress tracking
  useCoAgentStateRender<AgentState>({
    name: "agentic_generative_ui",
    render: ({ state }) => {
      if (!state.steps || state.steps.length === 0) {
        return null;
      }

      return (
        <div className="flex justify-center mb-4">
          <div className="bg-secondary rounded-lg w-full max-w-2xl p-4 text-primary space-y-3 shadow-lg">
            <h3 className="text-lg font-semibold text-primary mb-3">Task Progress</h3>
            {state.steps.map((step, index) => {
              if (step.status === "completed") {
                return (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FaCheck className="text-green-500 flex-shrink-0" />
                    <span className="text-primary">{step.description}</span>
                  </div>
                );
              } else if (
                step.status === "executing" ||
                (step.status === "pending" && index === state.steps.findIndex((s) => s.status === "pending"))
              ) {
                return (
                  <div key={index} className="flex items-center gap-2">
                    <FaSpinner className="text-blue-500 animate-spin flex-shrink-0" />
                    <span className="text-lg font-bold text-primary">
                      {step.description}
                    </span>
                  </div>
                );
              } else {
                return (
                  <div key={index} className="flex items-center gap-2 text-sm opacity-60">
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-full flex-shrink-0" />
                    <span className="text-secondary">{step.description}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>
      );
    },
  });

  return (
    <div className="h-full p-4">
      <div className="h-full max-w-4xl mx-auto">
        <CopilotChat
          className="h-full rounded-2xl shadow-lg"
          labels={{
            initial: "Hi! I can help you with complex tasks and show real-time progress updates. I'll break down your request into steps and show you the progress as I work. What would you like me to help you with?",
            placeholder: "Try: 'Create a plan for organizing my home office' or 'Help me plan a dinner party'",
          }}
        />
      </div>
    </div>
  );
}