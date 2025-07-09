"use client";

import { useState } from 'react';
import { FaTimes, FaPlus } from 'react-icons/fa';
import { api } from "~/trpc/react";
import ServerTemplates from './ServerTemplates';

interface AddServerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: () => void;
}

export default function AddServerDialog({ isOpen, onClose, onServerAdded }: AddServerDialogProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    transport: 'stdio' as 'stdio' | 'http',
    command: '',
    args: '',
    env: '',
    url: '',
    authType: 'none' as 'none' | 'bearer' | 'oauth',
    authToken: ''
  });

  const addServer = api.mcp.addServer.useMutation({
    onSuccess: () => {
      onServerAdded();
      onClose();
      setShowCustomForm(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        transport: 'stdio',
        command: '',
        args: '',
        env: '',
        url: '',
        authType: 'none',
        authToken: ''
      });
    },
    onError: (error) => {
      alert(`Failed to add server: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse args and env
      const args = formData.args ? formData.args.split(' ').filter(arg => arg.trim()) : undefined;
      const env = formData.env ? 
        Object.fromEntries(
          formData.env.split('\n')
            .filter(line => line.trim() && line.includes('='))
            .map(line => {
              const [key, ...valueParts] = line.split('=');
              const envKey = key?.trim() ?? '';
              const envValue = valueParts.join('=').trim();
              
              // Validate non-empty values
              if (!envKey || !envValue) {
                throw new Error(`Invalid environment variable: ${line}`);
              }
              
              return [envKey, envValue];
            })
        ) : undefined;

    // Debug logging
    console.log('AddServerDialog submission:', {
      command: formData.command,
      originalArgs: formData.args,
      parsedArgs: args,
      env
    });

    // Build auth object
    const auth = formData.authType !== 'none' ? {
      type: formData.authType,
      token: formData.authToken || undefined
    } : undefined;

    // Submit based on transport type
    if (formData.transport === 'stdio') {
      addServer.mutate({
        name: formData.name,
        description: formData.description,
        transport: 'stdio',
        command: formData.command,
        args,
        env,
        auth
      });
    } else {
      addServer.mutate({
        name: formData.name,
        description: formData.description,
        transport: 'http',
        url: formData.url,
        auth
      });
    }
    } catch (error) {
      alert(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-primary border border-primary rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-theme-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Add MCP Server</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <FaTimes className="text-secondary" />
          </button>
        </div>

        {!showCustomForm ? (
          <div>
            <ServerTemplates 
              onTemplateSelect={(template) => {
                // Pre-fill form with template data
                setFormData({
                  name: template.name,
                  description: template.description,
                  transport: template.transport,
                  command: template.command ?? '',
                  args: template.args?.join(' ') ?? '',
                  env: template.env ? Object.entries(template.env).map(([k, v]) => `${k}=${v}`).join('\n') : '',
                  url: template.url ?? '',
                  authType: 'none',
                  authToken: ''
                });
                setShowCustomForm(true);
              }}
            />
            
            <div className="mt-6 pt-4 border-t border-primary">
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full px-4 py-2 bg-tertiary text-primary rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2"
              >
                <FaPlus className="w-3 h-3" />
                Create Custom Server
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Info */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Server Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., File System Access"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Brief description of what this server does"
            />
          </div>

          {/* Transport Type */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Transport Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.transport === 'stdio'}
                  onChange={() => setFormData({ ...formData, transport: 'stdio' })}
                  className="text-blue-600"
                />
                <span className="text-primary">Local (stdio)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.transport === 'http'}
                  onChange={() => setFormData({ ...formData, transport: 'http' })}
                  className="text-blue-600"
                />
                <span className="text-primary">Remote (HTTP)</span>
              </label>
            </div>
          </div>

          {/* Stdio Configuration */}
          {formData.transport === 'stdio' && (
            <>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Command
                </label>
                <input
                  type="text"
                  required
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., npx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., /home/user/documents"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Environment Variables (one per line, KEY=value)
                </label>
                <textarea
                  value={formData.env}
                  onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder="API_KEY=your-key&#10;DEBUG=true"
                />
              </div>

              {/* Command Preview */}
              {formData.command && (
                <div className="bg-tertiary rounded-lg p-3">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Command Preview
                  </label>
                  <code className="text-sm font-mono text-secondary">
                    {formData.command} {formData.args}
                  </code>
                  <p className="text-xs text-tertiary mt-1">
                    This is the exact command that will be executed
                  </p>
                </div>
              )}
            </>
          )}

          {/* HTTP Configuration */}
          {formData.transport === 'http' && (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Server URL
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/mcp"
              />
            </div>
          )}

          {/* Authentication */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Authentication
            </label>
            <select
              value={formData.authType}
              onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'none' | 'bearer' | 'oauth' })}
              className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="oauth">OAuth (coming soon)</option>
            </select>
          </div>

          {formData.authType === 'bearer' && (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Bearer Token
              </label>
              <input
                type="text"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your API token"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="px-4 py-2 bg-tertiary text-primary rounded-lg hover:bg-secondary transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={addServer.isPending}
              className="flex-1 px-4 py-2 bg-button text-button rounded-lg hover:bg-button-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addServer.isPending ? 'Adding...' : 'Add Server'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-tertiary text-primary rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}