"use client";

import { FaKey } from "react-icons/fa";
import { api } from "~/trpc/react";

type Provider = "openrouter" | "openai" | "anthropic" | "google";

const PROVIDERS = [
  { id: "openrouter" as Provider, name: "OpenRouter" },
  { id: "openai" as Provider, name: "OpenAI" },
  { id: "anthropic" as Provider, name: "Anthropic" },
  { id: "google" as Provider, name: "Google" },
];

interface ProviderSelectorProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
  onOpenApiKeyModal: (provider: Provider) => void;
}

export default function ProviderSelector({
  selectedProvider,
  onProviderChange,
  onOpenApiKeyModal,
}: ProviderSelectorProps) {
  const { data: apiKeyStatus } = api.models.getApiKeyStatus.useQuery({
    userId: "default-user",
  });

  const currentProviderStatus = apiKeyStatus?.providers.find(p => p.provider === selectedProvider);
  const hasApiKey = currentProviderStatus?.isValid || false;

  return (
    <div className="space-y-3">
      {/* Provider Dropdown */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">
          API Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as Provider)}
          className="w-full p-2 border border-primary rounded-lg bg-input text-primary focus:border-focus focus:outline-none"
        >
          {PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {/* API Key Status */}
      <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
        <div>
          <div className="text-sm font-medium text-primary">
            {PROVIDERS.find(p => p.id === selectedProvider)?.name}
          </div>
          <div className={`text-xs ${hasApiKey ? "text-green-600" : "text-yellow-600"}`}>
            {hasApiKey ? "API key configured" : "API key required"}
          </div>
        </div>
        {!hasApiKey && (
          <button
            onClick={() => onOpenApiKeyModal(selectedProvider)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            <FaKey className="h-3 w-3" />
            Add Key
          </button>
        )}
      </div>
    </div>
  );
}