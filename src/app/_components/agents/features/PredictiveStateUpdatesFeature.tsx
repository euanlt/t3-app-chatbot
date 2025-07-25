"use client";

import React, { useState } from "react";
import { CopilotChat, useCopilotAction } from "@copilotkit/react-ui";
import { FaEdit, FaSave } from "react-icons/fa";

export default function PredictiveStateUpdatesFeature() {
  const [document, setDocument] = useState({
    title: "Untitled Document",
    content: "Click 'Start Writing' to begin creating your document with AI assistance...",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Tool for writing and updating documents
  useCopilotAction({
    name: "write_document",
    description: "Write or update a document with the given content. This will predictively update the UI as the content is being generated.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the document",
      },
      {
        name: "content",
        type: "string",
        description: "The main content of the document",
      },
    ],
    handler: ({ title, content }) => {
      // Predictive state update - immediately update UI
      setDocument({ title: title || document.title, content });
      return {
        status: "success",
        message: `Document updated: ${title || document.title}`,
      };
    },
  });

  // Tool for document state prediction
  useCopilotAction({
    name: "document_predict_state",
    description: "Predict and show potential changes to the document before applying them",
    parameters: [
      {
        name: "predicted_content",
        type: "string",
        description: "The predicted content that might be added or changed",
      },
      {
        name: "confidence",
        type: "number",
        description: "Confidence level of the prediction (0-1)",
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return (
        <DocumentPreview
          currentDocument={document}
          predictedContent={args.predicted_content}
          confidence={args.confidence}
          onApprove={() => {
            setDocument(prev => ({ ...prev, content: args.predicted_content }));
            respond("Changes approved and applied to document.");
          }}
          onReject={() => {
            respond("Changes rejected. Document remains unchanged.");
          }}
        />
      );
    },
  });

  return (
    <div className="h-full p-4 flex gap-4">
      {/* Document Editor */}
      <div className="flex-1 flex flex-col">
        <div className="bg-secondary rounded-lg shadow-lg flex-1 flex flex-col">
          {/* Document Header */}
          <div className="border-border-primary border-b p-4 flex items-center justify-between">
            <div className="flex-1">
              {isEditing ? (
                <input
                  value={document.title}
                  onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-input border-input text-primary rounded px-2 py-1 text-lg font-semibold w-full"
                  onBlur={() => setIsEditing(false)}
                  onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
                  autoFocus
                />
              ) : (
                <h2 
                  className="text-primary text-lg font-semibold cursor-pointer hover:text-blue-500"
                  onClick={() => setIsEditing(true)}
                >
                  {document.title}
                </h2>
              )}
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-secondary hover:text-primary p-2"
              title="Edit title"
            >
              <FaEdit size={16} />
            </button>
          </div>

          {/* Document Content */}
          <div className="flex-1 p-4">
            <textarea
              value={document.content}
              onChange={(e) => setDocument(prev => ({ ...prev, content: e.target.value }))}
              className="w-full h-full bg-transparent text-primary resize-none outline-none border-none"
              placeholder="Start writing your document here..."
            />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="w-96">
        <CopilotChat
          className="h-full rounded-2xl shadow-lg"
          labels={{
            initial: "I can help you write and edit documents with predictive updates. Tell me what you'd like to work on!",
            placeholder: "Try: 'Help me write a story about space exploration' or 'Continue this document'",
          }}
        />
      </div>
    </div>
  );
}

interface DocumentPreviewProps {
  currentDocument: { title: string; content: string };
  predictedContent: string;
  confidence: number;
  onApprove: () => void;
  onReject: () => void;
}

function DocumentPreview({ 
  currentDocument, 
  predictedContent, 
  confidence, 
  onApprove, 
  onReject 
}: DocumentPreviewProps) {
  return (
    <div className="bg-secondary rounded-lg p-4 my-2 max-w-lg shadow-lg">
      <h3 className="text-primary text-lg font-semibold mb-2">Predicted Changes</h3>
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-secondary">Confidence:</span>
          <div className="flex-1 bg-gray-300 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(confidence || 0) * 100}%` }}
            />
          </div>
          <span className="text-sm text-secondary">{Math.round((confidence || 0) * 100)}%</span>
        </div>
      </div>

      <div className="bg-tertiary rounded p-3 mb-4 max-h-40 overflow-y-auto">
        <div className="text-sm text-secondary mb-1">Preview:</div>
        <div className="text-primary whitespace-pre-wrap text-sm">{predictedContent}</div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onReject}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}