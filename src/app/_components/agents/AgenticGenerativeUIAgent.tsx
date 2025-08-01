"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

interface AgenticGenerativeUIAgentProps {
  agentId: string;
  agentName: string;
}

interface TaskStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  startTime?: Date;
  completedTime?: Date;
}

interface TaskExecution {
  id: string;
  title: string;
  description: string;
  steps: TaskStep[];
  overallProgress: number;
  status: "running" | "completed" | "failed";
  startTime: Date;
}

// Component for displaying task execution progress
function TaskExecutionDisplay({ 
  execution,
  onCancel 
}: { 
  execution: TaskExecution;
  onCancel: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-300";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-300";
      case "failed": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "✅";
      case "in_progress": return "⏳";
      case "failed": return "❌";
      default: return "⏸️";
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 m-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{execution.title}</h3>
          <p className="text-gray-600 mt-1">{execution.description}</p>
        </div>
        {execution.status === "running" && (
          <button
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">{Math.round(execution.overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${execution.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Task Steps */}
      <div className="space-y-3">
        {execution.steps.map((step) => (
          <div key={step.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-lg mr-2">{getStatusIcon(step.status)}</span>
                <div>
                  <h4 className="font-medium text-gray-800">{step.title}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(step.status)}`}>
                {step.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            {step.status === "in_progress" && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </div>
            )}

            {step.completedTime && (
              <div className="text-xs text-gray-500 mt-2">
                Completed at {step.completedTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Execution Info */}
      <div className="text-xs text-gray-400 border-t pt-3 mt-4">
        🚀 Started at {execution.startTime.toLocaleTimeString()} • 
        Status: {execution.status} • 
        Steps: {execution.steps.filter(s => s.status === "completed").length}/{execution.steps.length}
      </div>
    </div>
  );
}

// Main chat component with task execution UI
function AgenticGenerativeUIChat({ agentName }: { agentId: string; agentName: string }) {
  const [background, setBackground] = useState<string>("--copilot-kit-background-color");
  const [currentExecution, setCurrentExecution] = useState<TaskExecution | null>(null);

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

  // Task execution start action
  useCopilotAction({
    name: "ui_start_task_execution",
    description: "Start a long-running task with progress visualization",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Task title"
      },
      {
        name: "description",
        type: "string",
        description: "Task description"
      },
      {
        name: "steps",
        type: "object[]",
        description: "Array of task steps with id, title, and description"
      }
    ],
    handler: ({ title, description, steps }) => {
      console.log('Task execution started:', { title, description, steps });
      
      const taskSteps: TaskStep[] = (steps || []).map((step: unknown, index: number) => {
        const stepObj = step as { id?: string; title?: string; description?: string };
        return {
          id: stepObj.id || `step-${index}`,
          title: stepObj.title || `Step ${index + 1}`,
          description: stepObj.description || `Task step ${index + 1}`,
          status: "pending" as const,
          progress: 0,
        };
      });

      const execution: TaskExecution = {
        id: Date.now().toString(),
        title: title || "Long-running Task",
        description: description || "Executing complex task with multiple steps",
        steps: taskSteps,
        overallProgress: 0,
        status: "running",
        startTime: new Date()
      };

      setCurrentExecution(execution);
      
      return {
        status: "success",
        message: "Task execution started"
      };
    }
  });

  // Task step update action
  useCopilotAction({
    name: "ui_update_task_step",
    description: "Update the status and progress of a task step",
    parameters: [
      {
        name: "stepId",
        type: "string",
        description: "ID of the step to update"
      },
      {
        name: "status",
        type: "string",
        description: "New status of the step"
      },
      {
        name: "progress",
        type: "number",
        description: "Progress percentage (0-100)"
      }
    ],
    handler: ({ stepId, status, progress }) => {
      console.log('Task step update:', { stepId, status, progress });
      
      if (!currentExecution) return { status: "error", message: "No active execution" };

      setCurrentExecution(prev => {
        if (!prev) return null;
        
        const updatedSteps = prev.steps.map(step => {
          if (step.id === stepId) {
            return {
              ...step,
              status: status || step.status,
              progress: typeof progress === 'number' ? progress : step.progress,
              completedTime: status === "completed" ? new Date() : step.completedTime
            };
          }
          return step;
        });

        // Calculate overall progress
        const totalSteps = updatedSteps.length;
        const completedSteps = updatedSteps.filter(s => s.status === "completed").length;
        const inProgressSteps = updatedSteps.filter(s => s.status === "in_progress");
        const inProgressContribution = inProgressSteps.reduce((sum, step) => sum + (step.progress || 0), 0) / 100;
        
        const overallProgress = ((completedSteps + inProgressContribution) / totalSteps) * 100;

        return {
          ...prev,
          steps: updatedSteps,
          overallProgress,
          status: overallProgress >= 100 ? "completed" : "running"
        };
      });
      
      return {
        status: "success",
        message: `Step ${stepId} updated`
      };
    }
  });

  const handleCancel = () => {
    setCurrentExecution(null);
  };

  return (
    <div className="flex justify-center items-center h-full w-full" style={{ background }}>
      <div className="w-4/5 h-4/5 rounded-lg flex">
        {/* Chat area */}
        <div className="flex-1">
          <CopilotChat
            className="h-full rounded-2xl"
            labels={{
              title: agentName,
              initial: `Hello! I'm ${agentName}. I can execute long-running tasks and show you real-time progress with visual feedback. Try asking me to "deploy an application", "analyze a large dataset", or "process a batch of files"!`
            }}
          />
        </div>
        
        {/* Task execution display area */}
        {currentExecution && (
          <div className="w-1/2 ml-4 overflow-y-auto">
            <TaskExecutionDisplay
              execution={currentExecution}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgenticGenerativeUIAgent({ agentId, agentName }: AgenticGenerativeUIAgentProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <AgenticGenerativeUIChat agentId={agentId} agentName={agentName} />
    </CopilotKit>
  );
}