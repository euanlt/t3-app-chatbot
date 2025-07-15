"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { api } from "~/trpc/react";

interface AddCustomModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onModelAdded: () => void;
}

export default function AddCustomModelDialog({
  isOpen,
  onClose,
  onModelAdded,
}: AddCustomModelDialogProps) {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini" | "claude" | "openrouter">("openai");
  const [description, setDescription] = useState("");

  const createModel = api.customModels.createCustomModel.useMutation({
    onSuccess: () => {
      onModelAdded();
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setName("");
    setModelId("");
    setProvider("openai");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && modelId.trim()) {
      createModel.mutate({
        name: name.trim(),
        modelId: modelId.trim(),
        provider,
        description: description.trim() || undefined,
        userId: "default-user", // Using default user until authentication is implemented
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-primary border-primary max-h-[90vh] w-full max-w-md rounded-lg border p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-primary text-xl font-semibold">Add Custom Model</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary rounded p-1 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-primary mb-1 block text-sm font-medium">
              Model Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom GPT-4"
              className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

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
            <label htmlFor="modelId" className="text-primary mb-1 block text-sm font-medium">
              Model ID *
            </label>
            <input
              id="modelId"
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder={
                provider === "openai"
                  ? "e.g., gpt-4"
                  : provider === "gemini"
                  ? "e.g., gemini-pro"
                  : provider === "claude"
                  ? "e.g., claude-3-opus-20240229"
                  : "e.g., openai/gpt-4"
              }
              className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="text-primary mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this model"
              rows={3}
              className="border-primary bg-primary text-primary w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="bg-tertiary rounded-lg p-3 text-sm">
            <p className="text-primary mb-1 font-medium">Note:</p>
            <p className="text-secondary">
              You&apos;ll need to configure an API key for {provider} in the API Keys section to use this model.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-secondary text-primary hover:bg-tertiary flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !modelId.trim() || createModel.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {createModel.isPending ? "Adding..." : "Add Model"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}