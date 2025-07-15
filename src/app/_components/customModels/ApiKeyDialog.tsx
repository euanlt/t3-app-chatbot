"use client";

import { useState } from "react";
import { FaTimes, FaPlus, FaTrash, FaKey } from "react-icons/fa";
import { api } from "~/trpc/react";

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyDialog({ isOpen, onClose }: ApiKeyDialogProps) {
  const [showAddKey, setShowAddKey] = useState(false);
  const [provider, setProvider] = useState<"openai" | "gemini" | "claude" | "openrouter">("openai");
  const [keyName, setKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: apiKeysData, refetch } = api.customModels.getUserApiKeys.useQuery({
    userId: "default-user", // Using default user until authentication is implemented
  });
  const apiKeys = apiKeysData?.apiKeys ?? [];

  const createApiKey = api.customModels.createApiKey.useMutation({
    onSuccess: () => {
      void refetch();
      setShowAddKey(false);
      resetForm();
    },
  });

  const deleteApiKey = api.customModels.deleteApiKey.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const resetForm = () => {
    setProvider("openai");
    setKeyName("");
    setApiKey("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyName.trim() && apiKey.trim()) {
      createApiKey.mutate({
        provider,
        keyName: keyName.trim(),
        apiKey: apiKey.trim(),
        userId: "default-user", // Using default user until authentication is implemented
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-primary border-primary max-h-[90vh] w-full max-w-2xl rounded-lg border p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-primary text-xl font-semibold">API Key Management</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary rounded p-1 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Existing API Keys */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-primary font-medium">Your API Keys</h3>
              <button
                onClick={() => setShowAddKey(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
              >
                <FaPlus className="h-3 w-3" />
                Add Key
              </button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <FaKey className="text-secondary mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-secondary text-sm">No API keys configured</p>
                <p className="text-tertiary text-xs mt-1">
                  Add API keys to use custom models
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="border-primary bg-secondary rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-primary text-sm font-medium">
                            {key.keyName}
                          </span>
                          <span className="bg-tertiary text-tertiary rounded px-2 py-0.5 text-xs">
                            {key.provider}
                          </span>
                          {key.isActive && (
                            <span className="bg-green-100 text-green-700 rounded px-2 py-0.5 text-xs">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-secondary text-xs mt-1">
                          Added {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (confirm(`Delete API key "${key.keyName}"?`)) {
                              deleteApiKey.mutate({ id: key.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 rounded p-1 transition-colors"
                          title="Delete API key"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Key Form */}
          {showAddKey && (
            <div className="border-primary bg-tertiary rounded-lg border p-4">
              <h3 className="text-primary mb-4 font-medium">Add New API Key</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="provider" className="text-primary mb-1 block text-sm font-medium">
                    Provider *
                  </label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as typeof provider)}
                    className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="keyName" className="text-primary mb-1 block text-sm font-medium">
                    Key Name *
                  </label>
                  <input
                    id="keyName"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., My OpenAI Key"
                    className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="apiKey" className="text-primary mb-1 block text-sm font-medium">
                    API Key *
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      provider === "openai"
                        ? "sk-..."
                        : provider === "gemini"
                        ? "AI..."
                        : provider === "claude"
                        ? "sk-ant-..."
                        : "sk-or-..."
                    }
                    className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    Security Note:
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Your API key will be encrypted and stored securely. It will only be used to make requests to the selected provider.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddKey(false);
                      resetForm();
                    }}
                    className="bg-secondary text-primary hover:bg-tertiary flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!keyName.trim() || !apiKey.trim() || createApiKey.isPending}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createApiKey.isPending ? "Adding..." : "Add Key"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}