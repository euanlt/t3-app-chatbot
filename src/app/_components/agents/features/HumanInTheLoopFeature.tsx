"use client";

import React, { useState } from "react";
import { CopilotChat, useCopilotAction } from "@copilotkit/react-ui";
import { FaCheck, FaSquare, FaCheckSquare } from "react-icons/fa";
import type { StepsFeedbackArgs } from "~/lib/agents/types";

export default function HumanInTheLoopFeature() {
  // Tool for generating task steps that require human review
  useCopilotAction({
    name: "generate_task_steps",
    description: "Generates a list of steps for the user to perform and review. Each step can be enabled, disabled, or executing.",
    parameters: [
      {
        name: "steps",
        type: "object[]",
        attributes: [
          {
            name: "description",
            type: "string",
            description: "Description of the task step",
          },
          {
            name: "status",
            type: "string",
            enum: ["enabled", "disabled", "executing"],
            description: "Current status of the step",
          },
        ],
      },
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => {
      return <StepsFeedback args={args} respond={respond} status={status} />;
    },
  });

  return (
    <div className="h-full p-4">
      <div className="h-full max-w-4xl mx-auto">
        <CopilotChat
          className="h-full rounded-2xl shadow-lg"
          labels={{
            initial: "Hi, I'm an agent specialized in helping you with your tasks. I'll create detailed task lists for your review and approval. How can I help you today?",
            placeholder: "Try: 'Generate a list of steps for deep cleaning my kitchen' or 'Create a checklist for planning a wedding'",
          }}
        />
      </div>
    </div>
  );
}

interface StepsFeedbackProps {
  args: StepsFeedbackArgs;
  respond: (response: string) => void;
  status: string;
}

function StepsFeedback({ args, respond, status }: StepsFeedbackProps) {
  const [steps, setSteps] = useState(args.steps || []);
  const [feedback, setFeedback] = useState("");

  const toggleStep = (index: number) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      status: newSteps[index].status === "enabled" ? "disabled" : "enabled",
    };
    setSteps(newSteps);
  };

  const handleSubmit = () => {
    const enabledSteps = steps.filter((step) => step.status === "enabled");
    const response = `Steps approved! I'll proceed with ${enabledSteps.length} enabled steps.${
      feedback ? ` Additional feedback: ${feedback}` : ""
    }`;
    respond(response);
  };

  if (status === "loading") {
    return (
      <div className="bg-secondary rounded-lg p-4 my-2">
        <div className="text-primary">Generating task steps...</div>
      </div>
    );
  }

  return (
    <div className="bg-secondary rounded-lg p-4 my-2 max-w-2xl">
      <h3 className="text-primary text-lg font-semibold mb-3">Task Steps for Review</h3>
      <p className="text-secondary text-sm mb-4">
        Review the steps below. Click to enable/disable each step, then approve to proceed.
      </p>
      
      <div className="space-y-2 mb-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-2 rounded hover:bg-tertiary cursor-pointer transition-colors"
            onClick={() => toggleStep(index)}
          >
            <div className="mt-1">
              {step.status === "enabled" ? (
                <FaCheckSquare className="text-green-500" />
              ) : (
                <FaSquare className="text-gray-400" />
              )}
            </div>
            <div className={`flex-1 ${step.status === "enabled" ? "text-primary" : "text-secondary line-through"}`}>
              {step.description}
            </div>
            <div className="text-xs text-tertiary">
              {step.status === "executing" ? "Executing..." : step.status}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-primary text-sm font-medium mb-2">
          Additional Feedback (Optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any additional instructions or modifications..."
          className="w-full bg-input border-input text-primary rounded p-2 text-sm resize-none"
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => respond("Steps cancelled by user.")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          Approve Steps ({steps.filter((s) => s.status === "enabled").length})
        </button>
      </div>
    </div>
  );
}