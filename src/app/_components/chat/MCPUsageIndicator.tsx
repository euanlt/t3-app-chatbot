"use client";

import { useState } from 'react';
import { FaCog, FaSearch, FaFile, FaCode, FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

export interface MCPToolUsage {
  toolName: string;
  serverName: string;
  serverId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  timestamp: Date;
}

interface MCPUsageIndicatorProps {
  toolsUsed: MCPToolUsage[];
}

export default function MCPUsageIndicator({ toolsUsed }: MCPUsageIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolsUsed || toolsUsed.length === 0) {
    return null;
  }

  const getToolIcon = (toolName: string) => {
    const name = toolName.toLowerCase();
    if (name.includes('search')) return <FaSearch className="w-3 h-3" />;
    if (name.includes('file') || name.includes('read') || name.includes('write')) return <FaFile className="w-3 h-3" />;
    if (name.includes('git') || name.includes('code')) return <FaCode className="w-3 h-3" />;
    return <FaCog className="w-3 h-3" />;
  };

  const successCount = toolsUsed.filter(tool => tool.success).length;
  const failureCount = toolsUsed.filter(tool => !tool.success).length;

  return (
    <div className="mt-2 mb-1">
      {/* Summary Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-2 py-1 bg-tertiary hover:bg-secondary rounded-md text-xs text-secondary transition-colors"
      >
        <FaCog className="w-3 h-3" />
        <span>
          {toolsUsed.length} MCP tool{toolsUsed.length !== 1 ? 's' : ''} used
        </span>
        {successCount > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <FaCheckCircle className="w-3 h-3" />
            {successCount}
          </span>
        )}
        {failureCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <FaExclamationTriangle className="w-3 h-3" />
            {failureCount}
          </span>
        )}
        {isExpanded ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-tertiary rounded-lg border border-primary">
          <div className="space-y-2">
            {toolsUsed.map((tool, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 rounded border ${
                  tool.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getToolIcon(tool.toolName)}
                  <div>
                    <div className="font-medium text-sm text-primary">
                      {tool.serverName}/{tool.toolName}
                    </div>
                    {tool.error && (
                      <div className="text-xs text-red-600 mt-1">
                        {tool.error}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span>{tool.executionTime}ms</span>
                  {tool.success ? (
                    <FaCheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <FaExclamationTriangle className="w-3 h-3 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-2 border-t border-primary text-xs text-tertiary">
            <div className="flex justify-between">
              <span>Total execution time:</span>
              <span>{toolsUsed.reduce((sum, tool) => sum + tool.executionTime, 0)}ms</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Success rate:</span>
              <span>{Math.round((successCount / toolsUsed.length) * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}