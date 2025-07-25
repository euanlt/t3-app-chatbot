"use client";

import { useState } from "react";
import { FaPlay, FaComments, FaWifi, FaWifiSlash, FaUsers, FaExclamationTriangle } from "react-icons/fa";
import { getAvailableAgents } from "~/lib/agents/registry";

interface Agent {
  id: string;
  name: string;
  endpoint?: string;
  feature?: string;
}

interface AgentsTabProps {
  onSelectAgent?: (agent: Agent | null) => void;
}

export default function EnhancedAgentsTab({ onSelectAgent }: AgentsTabProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  // Get available agents from registry
  const availableAgents = getAvailableAgents();

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      setBackendStatus("checking");
      const response = await fetch("http://localhost:9000", { 
        method: "GET",
        mode: "no-cors" // Allow checking even if CORS is not set up
      });
      setBackendStatus("connected");
    } catch (error) {
      setBackendStatus("disconnected");
    }
  };

  // Check connection on mount
  useState(() => {
    checkBackendConnection();
  });

  const handleSelectFeature = (integrationId: string, featureId: string, featureName: string) => {
    const agent: Agent = {
      id: `${integrationId}/${featureId}`,
      name: featureName,
      endpoint: `/api/agents/${integrationId}/${featureId}`,
      feature: featureId,
    };
    
    setSelectedFeature(`${integrationId}/${featureId}`);
    if (onSelectAgent) {
      onSelectAgent(agent);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-primary font-medium flex items-center gap-2">
            <FaUsers className="h-4 w-4" />
            AG-UI Agents
          </h3>
          <button
            onClick={checkBackendConnection}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
              backendStatus === "connected" 
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : backendStatus === "disconnected"
                ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
            }`}
          >
            {backendStatus === "connected" && <FaWifi className="h-3 w-3" />}
            {backendStatus === "disconnected" && <FaWifiSlash className="h-3 w-3" />}
            {backendStatus === "checking" && <div className="h-3 w-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />}
            {backendStatus === "connected" ? "Online" : backendStatus === "disconnected" ? "Offline" : "Checking"}
          </button>
        </div>

        {/* Backend status message */}
        {backendStatus === "disconnected" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <FaExclamationTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">Backend Not Running</p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                  To use AG-UI agents, start the Python backend:
                </p>
                <code className="block bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs p-2 rounded mt-2 font-mono">
                  python -m pydantic_ai_examples.ag_ui
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent List */}
      <div className="space-y-4 flex-1 overflow-y-auto">
        {availableAgents.map((integration) => (
          <div key={integration.integrationId}>
            <h4 className="text-secondary mb-3 text-sm font-medium flex items-center gap-2">
              {integration.integrationName}
              <span className="bg-secondary px-2 py-0.5 rounded text-xs">
                {integration.features.length} features
              </span>
            </h4>
            
            <div className="space-y-2">
              {integration.features.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  integrationId={integration.integrationId}
                  isSelected={selectedFeature === `${integration.integrationId}/${feature.id}`}
                  isBackendConnected={backendStatus === "connected"}
                  onSelect={() => handleSelectFeature(integration.integrationId, feature.id, feature.name)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Guide */}
      <div className="mt-4 pt-4 border-t border-primary">
        <details className="text-sm">
          <summary className="text-secondary cursor-pointer hover:text-primary">
            Quick Start Guide
          </summary>
          <div className="mt-2 space-y-2 text-xs text-tertiary">
            <p>1. Install: <code className="bg-secondary px-1 rounded">pip install pydantic-ai-examples</code></p>
            <p>2. Set API key: <code className="bg-secondary px-1 rounded">export OPENAI_API_KEY=your_key</code></p>
            <p>3. Start backend: <code className="bg-secondary px-1 rounded">python -m pydantic_ai_examples.ag_ui</code></p>
            <p>4. Select a feature above to start chatting!</p>
          </div>
        </details>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: {
    id: string;
    name: string;
    description: string;
    endpoint: string;
  };
  integrationId: string;
  isSelected: boolean;
  isBackendConnected: boolean;
  onSelect: () => void;
}

function FeatureCard({ feature, isSelected, isBackendConnected, onSelect }: FeatureCardProps) {
  return (
    <div
      className={`shadow-theme-sm rounded-lg border p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          : "border-primary hover:border-hover bg-primary"
      } ${!isBackendConnected ? "opacity-50" : ""}`}
      onClick={isBackendConnected ? onSelect : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-sm font-medium ${
            isSelected ? "text-blue-600 dark:text-blue-400" : "text-primary"
          }`}>
            {feature.name}
          </div>
          <div className={`mt-1 text-xs leading-relaxed ${
            isSelected ? "text-blue-600/80 dark:text-blue-400/80" : "text-secondary"
          }`}>
            {feature.description}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-3">
          {isBackendConnected ? (
            <div className="h-2 w-2 rounded-full bg-green-500" title="Available" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-gray-400" title="Backend required" />
          )}
        </div>
      </div>

      {isBackendConnected && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          >
            <FaComments className="h-3 w-3" />
            Chat
          </button>
          
          {/* Feature-specific quick actions */}
          {feature.id === "agentic_chat" && (
            <div className="text-xs text-secondary bg-secondary px-2 py-1 rounded">
              Tools: Time, Background
            </div>
          )}
          {feature.id === "human_in_the_loop" && (
            <div className="text-xs text-secondary bg-secondary px-2 py-1 rounded">
              Interactive Tasks
            </div>
          )}
          {feature.id === "shared_state" && (
            <div className="text-xs text-secondary bg-secondary px-2 py-1 rounded">
              Recipe Editor
            </div>
          )}
        </div>
      )}
    </div>
  );
}