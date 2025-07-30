"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

interface HumanInTheLoopAgentProps {
  agentId: string;
  agentName: string;
}

interface TaskStep {
  description: string;
  status: "disabled" | "enabled" | "executing";
}

// Component for task approval with response - matching dojo pattern
function TaskApprovalWithResponse({ 
  steps, 
  respond,
  status 
}: { 
  steps: TaskStep[];
  respond: (response: any) => void;
  status: string;
}) {
  const [localSteps, setLocalSteps] = useState<TaskStep[]>(steps);
  const [accepted, setAccepted] = useState<boolean | null>(null);

  const handleCheckboxChange = (index: number) => {
    setLocalSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index
          ? {
              ...step,
              status: step.status === "enabled" ? "disabled" : "enabled",
            }
          : step
      )
    );
  };
  if (accepted !== null) {
    return (
      <div className="flex flex-col gap-4 w-[500px] bg-gray-100 rounded-lg p-8 mb-4">
        <div className="flex justify-center">
          <div className="mt-4 bg-gray-200 text-black py-2 px-4 rounded inline-block">
            {accepted ? "✓ Accepted" : "✗ Rejected"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-[500px] bg-gray-100 rounded-lg p-8 mb-4">
      <div className="text-black space-y-2">
        <h2 className="text-lg font-bold mb-4">Select Steps</h2>
        {localSteps.map((step, index) => (
          <div key={index} className="text-sm flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={step.status === "enabled"}
                onChange={() => handleCheckboxChange(index)}
                className="mr-2"
              />
              <span className={step.status !== "enabled" ? "line-through" : ""}>
                {step.description}
              </span>
            </label>
          </div>
        ))}
      </div>
      {accepted === null && (
        <div className="flex justify-end space-x-4">
          <button
            className={`bg-gray-200 text-black py-2 px-4 rounded disabled:opacity-50 ${
              status === "executing" ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={status !== "executing"}
            onClick={() => {
              setAccepted(false);
              respond({ accepted: false });
            }}
          >
            Reject
          </button>
          <button
            className={`bg-black text-white py-2 px-4 rounded disabled:opacity-50 ${
              status === "executing" ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={status !== "executing"}
            onClick={() => {
              setAccepted(true);
              respond({ 
                accepted: true, 
                steps: localSteps.filter(step => step.status === "enabled")
              });
            }}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

// Main chat component with task approval UI
function HumanInTheLoopChat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [background, setBackground] = useState<string>("--copilot-kit-background-color");

  // Background color action
  useCopilotAction({
    name: "change_background",
    description: "Change the background color of the chat",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background color or gradient"
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

  // Task approval with renderAndWaitForResponse - matching dojo pattern
  useCopilotAction({
    name: "generate_task_steps",
    description: "Generates a list of steps for the user to perform",
    parameters: [
      {
        name: "steps",
        type: "object[]",
        attributes: [
          {
            name: "description",
            type: "string"
          },
          {
            name: "status",
            type: "string",
            enum: ["enabled", "disabled", "executing"]
          }
        ]
      }
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => {
      if (!args.steps || args.steps.length === 0) {
        return null;
      }

      return (
        <TaskApprovalWithResponse
          steps={args.steps}
          respond={respond}
          status={status}
        />
      );
    }
  });


  return (
    <div className="flex justify-center items-center h-full w-full" style={{ background }}>
      <div className="w-8/10 h-8/10 rounded-lg">
        <CopilotChat
          className="h-full rounded-2xl"
          labels={{
            title: agentName,
            initial: "Hi, I'm an agent specialized in helping you with your tasks. How can I help you?"
          }}
        />
      </div>
    </div>
  );
}

export default function HumanInTheLoopAgent({ agentId, agentName }: HumanInTheLoopAgentProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <HumanInTheLoopChat agentId={agentId} agentName={agentName} />
    </CopilotKit>
  );
}