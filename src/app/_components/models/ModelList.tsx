"use client";

import { useState, useMemo } from "react";
import { FaSearch, FaTimes, FaSync } from "react-icons/fa";
import { api } from "~/trpc/react";

type Provider = "openrouter" | "openai" | "anthropic" | "google";

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  recommended?: boolean;
}

interface ModelListProps {
  selectedProvider: Provider;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelList({
  selectedProvider,
  selectedModel,
  onModelChange,
}: ModelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [useLiveData, setUseLiveData] = useState(false);

  const { data: modelsData, isLoading, refetch } = api.models.getModelsByProvider.useQuery({
    provider: selectedProvider,
    userId: "default-user",
    sortBy: "popularity",
    includeCustom: true,
    useLiveData,
  });

  const models = modelsData?.models || [];

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return models;
    }
    
    const query = searchQuery.toLowerCase();
    return models.filter(model => 
      model.name.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  const handleToggleLiveData = () => {
    setUseLiveData(!useLiveData);
    // Refetch will happen automatically due to the query dependency
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-primary rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-primary">
          Select Model
        </label>
        <button
          onClick={handleToggleLiveData}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            useLiveData 
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
          title={useLiveData ? "Using live data from API" : "Using cached data"}
        >
          <FaSync className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          {useLiveData ? "Live" : "Cached"}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 text-secondary" />
        </div>
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-primary rounded-lg bg-input text-primary focus:border-focus focus:outline-none text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <FaTimes className="h-4 w-4 text-secondary hover:text-primary" />
          </button>
        )}
      </div>

      {/* Models count */}
      <div className="text-xs text-secondary">
        {searchQuery ? (
          `${filteredModels.length} of ${models.length} models`
        ) : (
          `${models.length} models available`
        )}
      </div>

      {/* Models list */}
      {filteredModels.length === 0 ? (
        <div className="text-center py-6">
          {searchQuery ? (
            <>
              <div className="text-secondary mb-2">No models match "{searchQuery}"</div>
              <button 
                onClick={() => setSearchQuery("")}
                className="text-blue-500 hover:text-blue-600 text-sm underline"
              >
                Clear search
              </button>
            </>
          ) : models.length === 0 ? (
            <>
              <div className="text-secondary mb-2">No models available</div>
              <div className="text-tertiary text-sm mb-3">Configure your API key to view models</div>
              {!useLiveData && (
                <button
                  onClick={handleToggleLiveData}
                  className="text-blue-500 hover:text-blue-600 text-sm underline"
                >
                  Try live data
                </button>
              )}
            </>
          ) : (
            <div className="text-secondary">No models available</div>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-sm ${
                selectedModel === model.id
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                  : "border-primary hover:border-hover bg-primary"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    selectedModel === model.id ? "text-blue-600 dark:text-blue-400" : "text-primary"
                  }`}>
                    {model.name}
                    {model.recommended && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className={`text-xs mt-1 ${
                    selectedModel === model.id ? "text-blue-600/80 dark:text-blue-400/80" : "text-secondary"
                  }`}>
                    {model.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}