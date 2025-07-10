"use client";

import { useState } from "react";
import {
  FaRobot,
  FaFileAlt,
  FaPlug,
  FaPlus,
  FaPlay,
  FaStop,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { api } from "~/trpc/react";
import ThemeToggle from "~/app/_components/theme/ThemeToggle";
import AddServerDialog from "~/app/_components/mcp/AddServerDialog";
import EditServerDialog from "~/app/_components/mcp/EditServerDialog";
import ServerTemplates from "~/app/_components/mcp/ServerTemplates";

interface SidebarProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  uploadedFiles: Array<{ id: string; name: string }>;
  onFileUpload: (files: FileList) => void;
  onFileRemove: (fileId: string) => void;
}

export default function Sidebar({
  selectedModel,
  onModelChange,
  uploadedFiles,
  onFileUpload,
  onFileRemove,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"models" | "files" | "plugins">(
    "models",
  );
  const [showAddServerDialog, setShowAddServerDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);

  // Fetch models using tRPC
  const { data: modelsData } = api.models.getAvailableModels.useQuery();
  const { data: mcpServersData, refetch: refetchServers } =
    api.mcp.getUserServers.useQuery();

  const models = modelsData?.models ?? [];
  const mcpServers = mcpServersData?.servers ?? [];

  // Server management mutations
  const startServer = api.mcp.startServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    },
  });

  const stopServer = api.mcp.stopServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    },
  });

  const deleteServer = api.mcp.deleteServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    },
  });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="bg-sidebar border-primary flex h-full w-80 flex-col border-r">
      {/* Header */}
      <div className="border-primary flex items-center justify-between border-b p-4">
        <h2 className="text-primary flex items-center gap-2 text-xl font-semibold">
          <FaRobot className="text-blue-600" />
          AI Chatbot
        </h2>
        <ThemeToggle />
      </div>

      {/* Tabs */}
      <div className="border-primary flex border-b">
        <button
          onClick={() => setActiveTab("models")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "models"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-secondary hover:text-primary"
          }`}
        >
          <FaRobot className="mr-1 inline" />
          Models
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "files"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-secondary hover:text-primary"
          }`}
        >
          <FaFileAlt className="mr-1 inline" />
          Files
        </button>
        <button
          onClick={() => setActiveTab("plugins")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "plugins"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-secondary hover:text-primary"
          }`}
        >
          <FaPlug className="mr-1 inline" />
          Plugins
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Models Tab */}
        {activeTab === "models" && (
          <div className="space-y-4">
            <h3 className="text-primary mb-2 font-medium">Select AI Model</h3>

            {/* Free Models */}
            <div>
              <h4 className="text-secondary mb-2 text-sm font-medium">
                Free Models
              </h4>
              <div className="space-y-2">
                {models
                  .filter((m) => m.category === "free")
                  .map((model) => (
                    <div
                      key={model.id}
                      onClick={() => onModelChange(model.id)}
                      className={`shadow-theme-sm cursor-pointer rounded-lg border p-3 transition-all ${
                        selectedModel === model.id
                          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                          : "border-primary hover:border-hover bg-primary"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${selectedModel === model.id ? "text-blue-600 dark:text-blue-400" : "text-primary"}`}
                      >
                        {model.name}
                      </div>
                      <div
                        className={`mt-1 text-xs ${selectedModel === model.id ? "text-blue-600/80 dark:text-blue-400/80" : "text-secondary"}`}
                      >
                        {model.description}
                      </div>
                      {model.recommended && (
                        <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Recommended
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Premium Models */}
            <div className="mt-4">
              <h4 className="text-secondary mb-2 text-sm font-medium">
                Premium Models
              </h4>
              <div className="space-y-2">
                {models
                  .filter((m) => m.category === "premium")
                  .map((model) => (
                    <div
                      key={model.id}
                      onClick={() => onModelChange(model.id)}
                      className={`shadow-theme-sm cursor-pointer rounded-lg border p-3 transition-all ${
                        selectedModel === model.id
                          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                          : "border-primary hover:border-hover bg-primary"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${selectedModel === model.id ? "text-blue-600 dark:text-blue-400" : "text-primary"}`}
                      >
                        {model.name}
                      </div>
                      <div
                        className={`mt-1 text-xs ${selectedModel === model.id ? "text-blue-600/80 dark:text-blue-400/80" : "text-secondary"}`}
                      >
                        {model.description}
                      </div>
                      <div
                        className={`mt-1 text-xs ${selectedModel === model.id ? "text-blue-600/60 dark:text-blue-400/60" : "text-tertiary"}`}
                      >
                        ${model.pricing.prompt}/{model.pricing.completion} per
                        1M tokens
                      </div>
                      {model.recommended && (
                        <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Recommended
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div>
            <h3 className="text-primary mb-4 font-medium">File Management</h3>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block w-full cursor-pointer">
                <div className="border-secondary hover:border-hover rounded-lg border-2 border-dashed p-4 text-center transition-colors">
                  <FaFileAlt className="text-secondary mx-auto mb-2 text-2xl" />
                  <p className="text-secondary text-sm">
                    Click to upload files
                  </p>
                  <p className="text-tertiary mt-1 text-xs">
                    PDF, DOCX, TXT, Images
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                />
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-secondary text-sm font-medium">
                  Uploaded Files
                </h4>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-tertiary flex items-center justify-between rounded-lg p-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FaFileAlt className="text-secondary flex-shrink-0" />
                      <span className="text-primary truncate text-sm">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onFileRemove(file.id)}
                      className="flex-shrink-0 text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedFiles.length === 0 && (
              <p className="text-secondary mt-4 text-center text-sm">
                No files uploaded yet
              </p>
            )}
          </div>
        )}

        {/* Plugins Tab */}
        {activeTab === "plugins" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-primary font-medium">MCP Servers</h3>
              <button
                onClick={() => setShowAddServerDialog(true)}
                className="bg-button text-button hover:bg-button-hover shadow-theme-sm rounded-lg p-2 transition-colors"
                title="Add new server"
              >
                <FaPlus className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className="border-primary bg-primary shadow-theme-sm rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-primary text-sm font-medium">
                        {server.name}
                      </div>
                      <div className="text-secondary mt-1 text-xs">
                        {server.description}
                      </div>
                      <div className="text-tertiary mt-1 text-xs">
                        {server.transport === "stdio"
                          ? `Command: ${server.command}`
                          : `URL: ${server.url}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          server.status === "active"
                            ? "bg-green-500"
                            : server.status === "error"
                              ? "bg-red-500"
                              : server.status === "starting" ||
                                  server.status === "stopping"
                                ? "animate-pulse bg-yellow-500"
                                : "bg-gray-400 dark:bg-gray-600"
                        }`}
                        title={server.status}
                      />
                    </div>
                  </div>

                  {/* Show capabilities if server is active */}
                  {server.status === "active" &&
                    (server.tools?.length ?? 0) > 0 && (
                      <div className="text-secondary mt-2 text-xs">
                        Tools: {server.tools?.map((t) => t.name).join(", ")}
                      </div>
                    )}

                  <div className="mt-2 flex gap-2">
                    {server.status === "inactive" && (
                      <button
                        onClick={() =>
                          startServer.mutate({ serverId: server.id })
                        }
                        disabled={startServer.isPending}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
                      >
                        <FaPlay className="mr-1 inline" />
                        Start
                      </button>
                    )}
                    {(server.status === "active" ||
                      server.status === "starting") && (
                      <button
                        onClick={() =>
                          stopServer.mutate({ serverId: server.id })
                        }
                        disabled={stopServer.isPending}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
                      >
                        <FaStop className="mr-1 inline" />
                        Stop
                      </button>
                    )}
                    <button
                      onClick={() => setEditingServer(server.id)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                      title="Edit server"
                    >
                      <FaEdit className="inline" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete server "${server.name}"?`)) {
                          deleteServer.mutate({ id: server.id });
                        }
                      }}
                      disabled={
                        deleteServer.isPending || server.status !== "inactive"
                      }
                      className="bg-tertiary hover:bg-secondary text-primary rounded px-2 py-1 text-xs transition-colors disabled:opacity-50"
                      title={
                        server.status !== "inactive"
                          ? "Stop server before deleting"
                          : "Delete server"
                      }
                    >
                      <FaTrash className="inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {mcpServers.length === 0 && (
              <div>
                <ServerTemplates
                  onTemplateSelect={() => setShowAddServerDialog(true)}
                />

                <div className="border-primary mt-6 border-t pt-6">
                  <div className="text-center">
                    <p className="text-secondary mb-4 text-sm">
                      Or create a custom MCP server
                    </p>
                    <button
                      onClick={() => setShowAddServerDialog(true)}
                      className="bg-button text-button hover:bg-button-hover rounded-lg px-4 py-2 transition-colors"
                    >
                      <FaPlus className="mr-2 inline" />
                      Create Custom Server
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Server Dialog */}
      <AddServerDialog
        isOpen={showAddServerDialog}
        onClose={() => setShowAddServerDialog(false)}
        onServerAdded={() => void refetchServers()}
      />

      {/* Edit Server Dialog */}
      <EditServerDialog
        server={
          editingServer
            ? (mcpServers.find((s) => s.id === editingServer) ?? null)
            : null
        }
        isOpen={!!editingServer}
        onClose={() => setEditingServer(null)}
        onServerUpdated={() => void refetchServers()}
      />
    </div>
  );
}
