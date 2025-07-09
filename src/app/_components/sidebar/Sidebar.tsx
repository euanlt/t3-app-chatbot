"use client";

import { useState } from 'react';
import { FaRobot, FaFileAlt, FaPlug, FaCog, FaPlus, FaPlay, FaStop, FaTrash, FaEdit } from 'react-icons/fa';
import { api } from "~/trpc/react";
import ThemeToggle from "~/app/_components/theme/ThemeToggle";
import AddServerDialog from "~/app/_components/mcp/AddServerDialog";
import EditServerDialog from "~/app/_components/mcp/EditServerDialog";

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
  onFileRemove
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'files' | 'plugins'>('models');
  const [showAddServerDialog, setShowAddServerDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  
  // Fetch models using tRPC
  const { data: modelsData } = api.models.getAvailableModels.useQuery();
  const { data: mcpServersData, refetch: refetchServers } = api.mcp.getUserServers.useQuery();
  
  const models = modelsData?.models ?? [];
  const mcpServers = mcpServersData?.servers ?? [];
  
  // Server management mutations
  const startServer = api.mcp.startServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    }
  });
  
  const stopServer = api.mcp.stopServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    }
  });
  
  const deleteServer = api.mcp.deleteServer.useMutation({
    onSuccess: () => {
      void refetchServers();
    }
  });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="w-80 bg-sidebar border-r border-primary flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-primary flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
          <FaRobot className="text-blue-600" />
          AI Chatbot
        </h2>
        <ThemeToggle />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-primary">
        <button
          onClick={() => setActiveTab('models')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'models'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <FaRobot className="inline mr-1" />
          Models
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <FaFileAlt className="inline mr-1" />
          Files
        </button>
        <button
          onClick={() => setActiveTab('plugins')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'plugins'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <FaPlug className="inline mr-1" />
          Plugins
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            <h3 className="font-medium text-primary mb-2">Select AI Model</h3>
            
            {/* Free Models */}
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">Free Models</h4>
              <div className="space-y-2">
                {models.filter(m => m.category === 'free').map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all shadow-theme-sm ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'border-primary hover:border-hover bg-primary'
                    }`}
                  >
                    <div className={`font-medium text-sm ${selectedModel === model.id ? 'text-blue-600 dark:text-blue-400' : 'text-primary'}`}>{model.name}</div>
                    <div className={`text-xs mt-1 ${selectedModel === model.id ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-secondary'}`}>{model.description}</div>
                    {model.recommended && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Models */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-secondary mb-2">Premium Models</h4>
              <div className="space-y-2">
                {models.filter(m => m.category === 'premium').map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all shadow-theme-sm ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'border-primary hover:border-hover bg-primary'
                    }`}
                  >
                    <div className={`font-medium text-sm ${selectedModel === model.id ? 'text-blue-600 dark:text-blue-400' : 'text-primary'}`}>{model.name}</div>
                    <div className={`text-xs mt-1 ${selectedModel === model.id ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-secondary'}`}>{model.description}</div>
                    <div className={`text-xs mt-1 ${selectedModel === model.id ? 'text-blue-600/60 dark:text-blue-400/60' : 'text-tertiary'}`}>
                      ${model.pricing.prompt}/{model.pricing.completion} per 1M tokens
                    </div>
                    {model.recommended && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
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
        {activeTab === 'files' && (
          <div>
            <h3 className="font-medium text-primary mb-4">File Management</h3>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-secondary rounded-lg p-4 text-center hover:border-hover transition-colors">
                  <FaFileAlt className="mx-auto text-secondary text-2xl mb-2" />
                  <p className="text-sm text-secondary">Click to upload files</p>
                  <p className="text-xs text-tertiary mt-1">PDF, DOCX, TXT, Images</p>
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
                <h4 className="text-sm font-medium text-secondary">Uploaded Files</h4>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-tertiary rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FaFileAlt className="text-secondary flex-shrink-0" />
                      <span className="text-sm truncate text-primary">{file.name}</span>
                    </div>
                    <button
                      onClick={() => onFileRemove(file.id)}
                      className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedFiles.length === 0 && (
              <p className="text-sm text-secondary text-center mt-4">
                No files uploaded yet
              </p>
            )}
          </div>
        )}

        {/* Plugins Tab */}
        {activeTab === 'plugins' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-primary">MCP Servers</h3>
              <button
                onClick={() => setShowAddServerDialog(true)}
                className="p-2 bg-button text-button rounded-lg hover:bg-button-hover transition-colors shadow-theme-sm"
                title="Add new server"
              >
                <FaPlus className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className="p-3 rounded-lg border border-primary bg-primary shadow-theme-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-primary">{server.name}</div>
                      <div className="text-xs text-secondary mt-1">{server.description}</div>
                      <div className="text-xs text-tertiary mt-1">
                        {server.transport === 'stdio' ? `Command: ${server.command}` : `URL: ${server.url}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          server.status === 'active' ? 'bg-green-500' : 
                          server.status === 'error' ? 'bg-red-500' :
                          server.status === 'starting' || server.status === 'stopping' ? 'bg-yellow-500 animate-pulse' :
                          'bg-gray-400 dark:bg-gray-600'
                        }`}
                        title={server.status}
                      />
                    </div>
                  </div>
                  
                  {/* Show capabilities if server is active */}
                  {server.status === 'active' && (server.tools?.length ?? 0) > 0 && (
                    <div className="mt-2 text-xs text-secondary">
                      Tools: {server.tools?.map(t => t.name).join(', ')}
                    </div>
                  )}
                  
                  <div className="mt-2 flex gap-2">
                    {server.status === 'inactive' && (
                      <button 
                        onClick={() => startServer.mutate({ serverId: server.id })}
                        disabled={startServer.isPending}
                        className="text-xs px-2 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        <FaPlay className="inline mr-1" />
                        Start
                      </button>
                    )}
                    {(server.status === 'active' || server.status === 'starting') && (
                      <button 
                        onClick={() => stopServer.mutate({ serverId: server.id })}
                        disabled={stopServer.isPending}
                        className="text-xs px-2 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <FaStop className="inline mr-1" />
                        Stop
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingServer(server.id)}
                      className="text-xs px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
                      disabled={deleteServer.isPending || server.status !== 'inactive'}
                      className="text-xs px-2 py-1 bg-tertiary rounded hover:bg-secondary transition-colors text-primary disabled:opacity-50"
                      title={server.status !== 'inactive' ? 'Stop server before deleting' : 'Delete server'}
                    >
                      <FaTrash className="inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {mcpServers.length === 0 && (
              <div className="text-center mt-8">
                <p className="text-sm text-secondary mb-4">
                  No MCP servers configured
                </p>
                <button
                  onClick={() => setShowAddServerDialog(true)}
                  className="px-4 py-2 bg-button text-button rounded-lg hover:bg-button-hover transition-colors"
                >
                  <FaPlus className="inline mr-2" />
                  Add Your First Server
                </button>
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
        server={editingServer ? mcpServers.find(s => s.id === editingServer) || null : null}
        isOpen={!!editingServer}
        onClose={() => setEditingServer(null)}
        onServerUpdated={() => void refetchServers()}
      />
    </div>
  );
}