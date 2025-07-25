"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { api } from "~/trpc/react";

interface AddAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentAdded: () => void;
}

export default function AddAgentDialog({
  isOpen,
  onClose,
  onAgentAdded,
}: AddAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAgent = api.agents.create.useMutation({
    onSuccess: () => {
      onAgentAdded();
      onClose();
      // Reset form
      setName("");
      setDescription("");
      setEndpoint("");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!endpoint.trim()) {
      setError("Endpoint URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      setError("Invalid endpoint URL");
      return;
    }

    createAgent.mutate({
      name: name.trim(),
      description: description.trim(),
      endpoint: endpoint.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-primary shadow-theme-lg relative w-full max-w-md rounded-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-primary text-xl font-semibold">
            Add Custom Agent
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Agent"
                className="bg-input border-input text-primary focus:border-focus w-full rounded-lg border px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this agent does"
                className="bg-input border-input text-primary focus:border-focus w-full rounded-lg border px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Endpoint URL
              </label>
              <input
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:8000/agent"
                className="bg-input border-input text-primary focus:border-focus w-full rounded-lg border px-3 py-2 outline-none"
              />
              <p className="text-tertiary mt-1 text-xs">
                The HTTP endpoint where your agent is running
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

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
              disabled={createAgent.isPending}
              className="bg-button text-button hover:bg-button-hover flex-1 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              {createAgent.isPending ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}