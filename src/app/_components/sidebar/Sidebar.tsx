"use client";

import { useState } from 'react';
import { FaRobot, FaFileAlt, FaPlug, FaCog } from 'react-icons/fa';
import { api } from "~/trpc/react";

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
  
  // Fetch models using tRPC
  const { data: modelsData } = api.models.getAvailableModels.useQuery();
  const { data: mcpServersData } = api.mcp.getAvailableServers.useQuery();
  
  const models = modelsData?.models ?? [];
  const mcpServers = mcpServersData?.servers ?? [];

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FaRobot className="text-blue-600" />
          AI Chatbot
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('models')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'models'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
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
              : 'text-gray-600 hover:text-gray-800'
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
              : 'text-gray-600 hover:text-gray-800'
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
            <h3 className="font-medium text-gray-700 mb-2">Select AI Model</h3>
            
            {/* Free Models */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Free Models</h4>
              <div className="space-y-2">
                {models.filter(m => m.category === 'free').map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{model.description}</div>
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
              <h4 className="text-sm font-medium text-gray-600 mb-2">Premium Models</h4>
              <div className="space-y-2">
                {models.filter(m => m.category === 'premium').map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{model.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
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
            <h3 className="font-medium text-gray-700 mb-4">File Management</h3>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <FaFileAlt className="mx-auto text-gray-400 text-2xl mb-2" />
                  <p className="text-sm text-gray-600">Click to upload files</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, Images</p>
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
                <h4 className="text-sm font-medium text-gray-600">Uploaded Files</h4>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FaFileAlt className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
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
              <p className="text-sm text-gray-500 text-center mt-4">
                No files uploaded yet
              </p>
            )}
          </div>
        )}

        {/* Plugins Tab */}
        {activeTab === 'plugins' && (
          <div>
            <h3 className="font-medium text-gray-700 mb-4">MCP Plugins</h3>
            
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className="p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{server.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{server.description}</div>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        server.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      {server.status === 'active' ? 'Stop' : 'Start'}
                    </button>
                    <button className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      <FaCog className="inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {mcpServers.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                No MCP plugins available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}