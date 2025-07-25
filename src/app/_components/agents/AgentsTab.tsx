"use client";

import { useState } from "react";
import { FaPlus, FaPlay, FaStop, FaTrash, FaEdit, FaCog } from "react-icons/fa";
import { api } from "~/trpc/react";
import AddAgentDialog from "./AddAgentDialog";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: "pydantic" | "custom";
  endpoint?: string;
  config?: Record<string, any>;
  status: "active" | "inactive" | "error";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function AgentsTab() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  // Fetch agents using tRPC
  const { data: agents = [], refetch: refetchAgents } = api.agents.list.useQuery();

  // Mutations
  const startAgent = api.agents.start.useMutation({
    onSuccess: () => {
      void refetchAgents();
    },
  });

  const stopAgent = api.agents.stop.useMutation({
    onSuccess: () => {
      void refetchAgents();
    },
  });

  const deleteAgent = api.agents.delete.useMutation({
    onSuccess: () => {
      void refetchAgents();
    },
  });

  const handleStartAgent = (agentId: string) => {
    startAgent.mutate({ id: agentId });
  };

  const handleStopAgent = (agentId: string) => {
    stopAgent.mutate({ id: agentId });
  };

  const handleDeleteAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (confirm(`Delete agent "${agent?.name}"?`)) {
      deleteAgent.mutate({ id: agentId });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-primary font-medium">AI Agents</h3>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-button text-button hover:bg-button-hover shadow-theme-sm rounded-lg p-2 transition-colors"
          title="Add new agent"
        >
          <FaPlus className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* PydanticAI Agents */}
        <div>
          <h4 className="text-secondary mb-2 text-sm font-medium">
            PydanticAI Agents
          </h4>
          <div className="space-y-2">
            {agents
              .filter((agent) => agent.type === "pydantic")
              .map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent === agent.id}
                  onSelect={() => setSelectedAgent(agent.id)}
                  onStart={() => handleStartAgent(agent.id)}
                  onStop={() => handleStopAgent(agent.id)}
                  onEdit={() => setEditingAgent(agent.id)}
                  onDelete={() => handleDeleteAgent(agent.id)}
                />
              ))}
          </div>
        </div>

        {/* Custom Agents */}
        <div className="mt-4">
          <h4 className="text-secondary mb-2 text-sm font-medium">
            Custom Agents
          </h4>
          <div className="space-y-2">
            {agents.filter((agent) => agent.type === "custom").length === 0 ? (
              <div className="text-center py-4">
                <p className="text-secondary text-sm">No custom agents yet</p>
                <p className="text-tertiary text-xs mt-1">
                  Create your own AI agents
                </p>
              </div>
            ) : (
              agents
                .filter((agent) => agent.type === "custom")
                .map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent === agent.id}
                    onSelect={() => setSelectedAgent(agent.id)}
                    onStart={() => handleStartAgent(agent.id)}
                    onStop={() => handleStopAgent(agent.id)}
                    onEdit={() => setEditingAgent(agent.id)}
                    onDelete={() => handleDeleteAgent(agent.id)}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAgentAdded={() => void refetchAgents()}
      />
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onStart,
  onStop,
  onEdit,
  onDelete,
}: AgentCardProps) {
  return (
    <div
      className={`shadow-theme-sm rounded-lg border p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          : "border-primary hover:border-hover bg-primary"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div
            className={`text-sm font-medium ${
              isSelected
                ? "text-blue-600 dark:text-blue-400"
                : "text-primary"
            }`}
          >
            {agent.name}
          </div>
          <div
            className={`mt-1 text-xs ${
              isSelected
                ? "text-blue-600/80 dark:text-blue-400/80"
                : "text-secondary"
            }`}
          >
            {agent.description}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              agent.status === "active"
                ? "bg-green-500"
                : agent.status === "error"
                ? "bg-red-500"
                : "bg-gray-400 dark:bg-gray-600"
            }`}
            title={agent.status}
          />
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {agent.status === "inactive" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          >
            <FaPlay className="mr-1 inline" />
            Start
          </button>
        )}
        {agent.status === "active" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            <FaStop className="mr-1 inline" />
            Stop
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          title="Configure agent"
        >
          <FaCog className="inline" />
        </button>
        {agent.type === "custom" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="bg-tertiary hover:bg-secondary text-primary rounded px-2 py-1 text-xs transition-colors"
            title="Delete agent"
          >
            <FaTrash className="inline" />
          </button>
        )}
      </div>
    </div>
  );
}