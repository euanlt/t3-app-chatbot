"use client";

import { useState, useEffect } from "react";
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
  respond?: (response: unknown) => void;
  status?: string;
}) {
  console.log("TaskApprovalWithResponse received steps:", JSON.stringify(steps, null, 2));
  const [localSteps, setLocalSteps] = useState<TaskStep[]>(steps);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  
  // Update localSteps when steps prop changes
  useEffect(() => {
    console.log("Steps prop changed, updating localSteps:", steps);
    setLocalSteps(steps);
  }, [steps]);

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
              respond?.({ accepted: false });
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
              respond?.({ 
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
function HumanInTheLoopChat({ agentName }: { agentId: string; agentName: string }) {
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

  // Action to handle task approval component from Python agent
  useCopilotAction({
    name: "task_approval",
    description: "Display task approval UI component",
    parameters: [
      {
        name: "steps",
        type: "object[]",
        description: "Array of task steps to approve"
      }
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => {
      console.log("task_approval called with full args:", JSON.stringify(args, null, 2));
      
      // Try different ways to extract steps
      let steps = [];
      
      // Direct steps array
      if (args?.steps && Array.isArray(args.steps)) {
        steps = args.steps;
      }
      // Check if args itself is the steps array
      else if (Array.isArray(args)) {
        steps = args;
      }
      // Check for value.steps (CustomEvent format)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((args as any)?.value?.steps && Array.isArray((args as any).value.steps)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps = (args as any).value.steps;
      }
      // Check for element property (AG-UI protocol)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((args as any)?.element?.steps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps = (args as any).element.steps;
      }
      // Check for type and steps at root
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((args as any)?.type === "task_approval" && (args as any)?.steps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps = (args as any).steps;
      }
      
      console.log("Extracted steps:", JSON.stringify(steps, null, 2));
      
      if (!steps || steps.length === 0) {
        return (
          <div className="flex flex-col gap-4 w-[500px] bg-gray-100 rounded-lg p-8 mb-4">
            <div className="text-black text-center">
              <p>No tasks found in data</p>
              <pre className="text-xs mt-2 p-2 bg-gray-200 rounded text-left overflow-auto max-h-40">
                {JSON.stringify(args, null, 2)}
              </pre>
              <button
                className="bg-black text-white py-2 px-4 rounded mt-2"
                onClick={() => respond?.({ accepted: false })}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      }

      // Format steps for the UI component - more robust extraction
      const formattedSteps = steps.map((step: unknown, index: number) => {
        console.log(`Processing step ${index}:`, JSON.stringify(step, null, 2));
        
        // Extract description from various possible locations
        let description = "";
        
        if (typeof step === 'string') {
          description = step;
        } else if (step && typeof step === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stepObj = step as any;
          description = stepObj.description || 
                       stepObj.text || 
                       stepObj.task ||
                       stepObj.step ||
                       stepObj.title ||
                       stepObj.name ||
                       stepObj.content ||
                       (stepObj.id ? `Task ${stepObj.id}` : `Task ${index + 1}`);
        }
        
        return {
          description: description || `Task ${index + 1}`,
          status: "enabled"
        };
      });

      console.log("Formatted steps:", formattedSteps);

      return (
        <TaskApprovalWithResponse
          steps={formattedSteps}
          respond={respond}
          status={status}
        />
      );
    }
  });

  // Also keep the original action for backward compatibility
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
      console.log("HITL renderAndWaitForResponse called with:", { args, status });
      
      // Handle different possible data structures
      let steps = [];
      if (args?.steps && Array.isArray(args.steps)) {
        steps = args.steps;
      } else if (args && Array.isArray(args)) {
        steps = args;
      } else if (typeof args === 'object' && args !== null) {
        // Look for steps in any property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const argsObj = args as any;
        for (const key in argsObj) {
          if (Array.isArray(argsObj[key])) {
            steps = argsObj[key];
            break;
          }
        }
      }
      
      console.log("Processed steps:", steps);
      
      if (!steps || steps.length === 0) {
        console.log("No steps found, raw args:", JSON.stringify(args, null, 2));
        return (
          <div className="flex flex-col gap-4 w-[500px] bg-gray-100 rounded-lg p-8 mb-4">
            <div className="text-black text-center">
              <p>No steps provided</p>
              <pre className="text-xs mt-2 p-2 bg-gray-200 rounded text-left">
                {JSON.stringify(args, null, 2)}
              </pre>
              <button
                className="bg-black text-white py-2 px-4 rounded mt-2"
                onClick={() => respond?.({ accepted: false })}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      }

      // Convert steps to proper format if needed
      const formattedSteps = steps.map((step: unknown, index: number) => {
        console.log(`Processing step ${index}:`, step, typeof step);
        
        if (typeof step === 'string') {
          return {
            description: step,
            status: "enabled"
          };
        }
        
        if (typeof step === 'object' && step !== null) {
          // Try to extract description from various possible fields
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stepObj = step as any;
          let description = stepObj.description || 
                           stepObj.text || 
                           stepObj.step || 
                           stepObj.instruction ||
                           stepObj.task ||
                           stepObj.name ||
                           stepObj.title;
          
          // If no description found, check if it's an array or has a value property
          if (!description) {
            if (Array.isArray(step) && step[0]) {
              description = String(step[0]);
            } else if (stepObj.value !== undefined) {
              description = String(stepObj.value);
            } else {
              // Last resort: stringify but make it readable
              const stringified = JSON.stringify(step);
              if (stringified === '{}') {
                description = 'Empty step';
              } else if (stringified.length > 100) {
                description = 'Complex step object';
              } else {
                description = stringified;
              }
            }
          }
          
          return {
            description: String(description || 'Unnamed step'),
            status: step.status || "enabled"
          };
        }
        
        // Fallback for other types
        return {
          description: String(step),
          status: "enabled"
        };
      });

      console.log("Final formattedSteps being passed to TaskApprovalWithResponse:", JSON.stringify(formattedSteps, null, 2));

      return (
        <TaskApprovalWithResponse
          steps={formattedSteps}
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