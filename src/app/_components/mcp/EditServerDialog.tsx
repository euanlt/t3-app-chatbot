"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaSave, FaPlay, FaStop } from "react-icons/fa";
import { api } from "~/trpc/react";

interface MCPServer {
  id: string;
  name: string;
  description: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  status: "inactive" | "starting" | "active" | "error" | "stopping";
  auth?: {
    type: "none" | "bearer" | "oauth";
    token?: string;
  };
}

interface EditServerDialogProps {
  server: MCPServer | null;
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated: () => void;
}

export default function EditServerDialog({
  server,
  isOpen,
  onClose,
  onServerUpdated,
}: EditServerDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    transport: "stdio" as "stdio" | "http",
    command: "",
    args: "",
    env: "",
    url: "",
    authType: "none" as "none" | "bearer" | "oauth",
    authToken: "",
  });
  const [needsRestart, setNeedsRestart] = useState(false);

  // Populate form when server changes
  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        description: server.description,
        transport: server.transport,
        command: server.command ?? "",
        args: server.args?.join(" ") ?? "",
        env: server.env
          ? Object.entries(server.env)
              .map(([k, v]) => `${k}=${v}`)
              .join("\n")
          : "",
        url: server.url ?? "",
        authType: server.auth?.type ?? "none",
        authToken: server.auth?.token ?? "",
      });
      setNeedsRestart(false);
    }
  }, [server]);

  const updateServer = api.mcp.updateServer.useMutation({
    onSuccess: () => {
      onServerUpdated();
      onClose();
    },
    onError: (error) => {
      alert(`Failed to update server: ${error.message}`);
    },
  });

  const startServer = api.mcp.startServer.useMutation({
    onSuccess: () => {
      onServerUpdated();
      setNeedsRestart(false);
    },
    onError: (error) => {
      alert(`Failed to start server: ${error.message}`);
    },
  });

  const stopServer = api.mcp.stopServer.useMutation({
    onSuccess: () => {
      onServerUpdated();
    },
    onError: (error) => {
      alert(`Failed to stop server: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!server) return;

    try {
      // Parse args and env
      const args = formData.args
        ? formData.args.split(" ").filter((arg) => arg.trim())
        : undefined;
      const env = formData.env
        ? Object.fromEntries(
            formData.env
              .split("\n")
              .filter((line) => line.trim() && line.includes("="))
              .map((line) => {
                const [key, ...valueParts] = line.split("=");
                const envKey = key?.trim() ?? "";
                const envValue = valueParts.join("=").trim();

                if (!envKey || !envValue) {
                  throw new Error(`Invalid environment variable: ${line}`);
                }

                return [envKey, envValue];
              }),
          )
        : undefined;

      // Build auth object
      const auth =
        formData.authType !== "none"
          ? {
              type: formData.authType,
              token: formData.authToken || undefined,
            }
          : undefined;

      // Check if critical changes were made that require restart
      const criticalChanges =
        formData.command !== server.command ||
        JSON.stringify(args) !== JSON.stringify(server.args) ||
        JSON.stringify(env) !== JSON.stringify(server.env) ||
        formData.url !== server.url;

      setNeedsRestart(criticalChanges && server.status === "active");

      // Submit update
      updateServer.mutate({
        id: server.id,
        name: formData.name,
        description: formData.description,
        command: formData.transport === "stdio" ? formData.command : undefined,
        args: formData.transport === "stdio" ? args : undefined,
        env: formData.transport === "stdio" ? env : undefined,
        url: formData.transport === "http" ? formData.url : undefined,
        auth,
      });
    } catch (error) {
      alert(
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleRestart = async () => {
    if (!server) return;

    try {
      // Stop then start the server
      await stopServer.mutateAsync({ serverId: server.id });
      await startServer.mutateAsync({ serverId: server.id });
    } catch (error) {
      console.error("Failed to restart server:", error);
    }
  };

  if (!isOpen || !server) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-primary border-primary shadow-theme-md max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-primary text-xl font-semibold">
            Edit MCP Server
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-secondary rounded-lg p-2 transition-colors"
          >
            <FaTimes className="text-secondary" />
          </button>
        </div>

        {/* Server Status */}
        <div className="bg-tertiary mb-4 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-primary text-sm font-medium">Status: </span>
              <span
                className={`text-sm font-medium ${
                  server.status === "active"
                    ? "text-green-600"
                    : server.status === "error"
                      ? "text-red-600"
                      : server.status === "starting"
                        ? "text-yellow-600"
                        : "text-gray-600"
                }`}
              >
                {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
              </span>
            </div>

            <div className="flex gap-2">
              {server.status === "active" ? (
                <button
                  onClick={() => stopServer.mutate({ serverId: server.id })}
                  disabled={stopServer.isPending}
                  className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <FaStop className="h-3 w-3" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => startServer.mutate({ serverId: server.id })}
                  disabled={startServer.isPending}
                  className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <FaPlay className="h-3 w-3" />
                  Start
                </button>
              )}
            </div>
          </div>

          {needsRestart && (
            <div className="mt-2 rounded border border-yellow-300 bg-yellow-100 p-2 text-sm">
              <p className="text-yellow-800">
                Configuration changes require a server restart to take effect.
              </p>
              <button
                onClick={handleRestart}
                className="mt-1 rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700"
              >
                Restart Now
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Info */}
          <div>
            <label className="text-primary mb-1 block text-sm font-medium">
              Server Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-primary mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={2}
            />
          </div>

          {/* Transport-specific fields */}
          {formData.transport === "stdio" && (
            <>
              <div>
                <label className="text-primary mb-1 block text-sm font-medium">
                  Command
                </label>
                <input
                  type="text"
                  required
                  value={formData.command}
                  onChange={(e) =>
                    setFormData({ ...formData, command: e.target.value })
                  }
                  className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-primary mb-1 block text-sm font-medium">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={(e) =>
                    setFormData({ ...formData, args: e.target.value })
                  }
                  className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-primary mb-1 block text-sm font-medium">
                  Environment Variables (one per line, KEY=value)
                </label>
                <textarea
                  value={formData.env}
                  onChange={(e) =>
                    setFormData({ ...formData, env: e.target.value })
                  }
                  className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>
            </>
          )}

          {formData.transport === "http" && (
            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Server URL
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Authentication */}
          <div>
            <label className="text-primary mb-1 block text-sm font-medium">
              Authentication
            </label>
            <select
              value={formData.authType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  authType: e.target.value as "none" | "bearer" | "oauth",
                })
              }
              className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="oauth">OAuth (coming soon)</option>
            </select>
          </div>

          {formData.authType === "bearer" && (
            <div>
              <label className="text-primary mb-1 block text-sm font-medium">
                Bearer Token
              </label>
              <input
                type="text"
                value={formData.authToken}
                onChange={(e) =>
                  setFormData({ ...formData, authToken: e.target.value })
                }
                className="bg-input border-primary text-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={updateServer.isPending}
              className="bg-button text-button hover:bg-button-hover flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSave className="h-4 w-4" />
              {updateServer.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-tertiary text-primary hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
