"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaEye, FaEyeSlash, FaKey, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { api } from "~/trpc/react";

type Provider = "openrouter" | "openai" | "anthropic" | "google";

interface ProviderInfo {
  id: Provider;
  name: string;
  description: string;
  docsUrl: string;
  keyPattern: RegExp;
  keyPlaceholder: string;
}

const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access to 100+ models from various providers",
    docsUrl: "https://openrouter.ai/keys",
    keyPattern: /^sk-or-v1-[a-f0-9]{64}$/,
    keyPlaceholder: "sk-or-v1-...",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo, GPT-3.5 and more",
    docsUrl: "https://platform.openai.com/api-keys",
    keyPattern: /^sk-[a-zA-Z0-9]{20,}$/,
    keyPlaceholder: "sk-...",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet and Claude family models",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyPattern: /^sk-ant-api03-[a-zA-Z0-9_-]+$/,
    keyPlaceholder: "sk-ant-api03-...",
  },
  google: {
    id: "google",
    name: "Google",
    description: "Gemini Pro, Gemini Flash and PaLM models",
    docsUrl: "https://makersuite.google.com/app/apikey",
    keyPattern: /^[a-zA-Z0-9_-]{39}$/,
    keyPlaceholder: "AIzaSy...",
  },
};

interface ApiKeyModalProps {
  isOpen: boolean;
  provider: Provider | null;
  onClose: () => void;
  onKeyAdded: () => void;
}

export default function ApiKeyModal({
  isOpen,
  provider,
  onClose,
  onKeyAdded,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const providerInfo = provider ? PROVIDER_INFO[provider] : null;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setApiKey("");
      setKeyName("");
      setShowKey(false);
      setError(null);
      setIsValidating(false);
      if (providerInfo) {
        setKeyName(`${providerInfo.name} API Key`);
      }
    }
  }, [isOpen, providerInfo]);

  // Create API key mutation
  const createApiKey = api.customModels.createApiKey.useMutation({
    onSuccess: () => {
      onKeyAdded();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
      setIsValidating(false);
    },
  });

  const validateApiKey = (key: string): boolean => {
    if (!providerInfo) return false;
    return providerInfo.keyPattern.test(key.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!provider || !providerInfo) {
      setError("Invalid provider selected");
      return;
    }

    // Basic validation
    if (!keyName.trim()) {
      setError("Key name is required");
      return;
    }

    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    if (!validateApiKey(apiKey)) {
      setError(`Invalid ${providerInfo.name} API key format`);
      return;
    }

    setIsValidating(true);

    try {
      await createApiKey.mutateAsync({
        provider: provider === "google" ? "gemini" : provider,
        keyName: keyName.trim(),
        apiKey: apiKey.trim(),
        userId: "default-user",
      });
    } catch (error) {
      // Error handled in onError callback
    }
  };

  if (!isOpen || !provider || !providerInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-primary shadow-theme-lg relative w-full max-w-md rounded-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <FaKey className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-primary text-lg font-semibold">
                Add {providerInfo.name} API Key
              </h2>
              <p className="text-secondary text-sm">
                {providerInfo.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                Get your API key
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                Visit the {providerInfo.name} dashboard to create an API key.
              </p>
              <a
                href={providerInfo.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 text-xs underline hover:no-underline"
              >
                Open {providerInfo.name} Dashboard →
              </a>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Key Name */}
            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., My OpenAI Key"
                className="bg-input border-input text-primary focus:border-focus w-full rounded-lg border px-3 py-2 outline-none"
                required
              />
              <p className="text-tertiary mt-1 text-xs">
                A friendly name to identify this key
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerInfo.keyPlaceholder}
                  className="bg-input border-input text-primary focus:border-focus w-full rounded-lg border px-3 py-2 pr-10 outline-none font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                >
                  {showKey ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-tertiary text-xs">
                  Your key is encrypted and stored securely
                </p>
                {apiKey && (
                  <div className="flex items-center gap-1">
                    {validateApiKey(apiKey) ? (
                      <>
                        <FaCheck className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">Valid format</span>
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-600">Invalid format</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-secondary hover:bg-secondary/80 text-primary flex-1 rounded-lg px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !validateApiKey(apiKey)}
              className="bg-button text-button hover:bg-button-hover flex-1 rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? "Saving..." : "Save API Key"}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-xs text-tertiary">
            🔒 Your API keys are encrypted using AES-256 encryption and stored securely. 
            They are only used to make requests to the respective AI providers and are never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}