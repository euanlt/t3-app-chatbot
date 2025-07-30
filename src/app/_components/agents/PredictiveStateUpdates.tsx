"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { CopilotKit, useCoAgent, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { diffWords } from "diff";
import * as MarkdownIt from "markdown-it";

interface PredictiveStateUpdatesProps {
  agentId: string;
  agentName: string;
}

interface AgentState {
  document: string;
}

const extensions = [StarterKit];

// Component for confirming changes
function ConfirmChanges({ 
  args, 
  respond, 
  status, 
  onReject, 
  onConfirm 
}: { 
  args: any;
  respond: (response: any) => void;
  status: string;
  onReject: () => void;
  onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  
  return (
    <div className="bg-white p-6 rounded shadow-lg border border-gray-200 mt-5 mb-5">
      <h2 className="text-lg font-bold mb-4">Confirm Changes</h2>
      <p className="mb-6">Do you want to accept the changes?</p>
      {accepted === null && (
        <div className="flex justify-end space-x-4">
          <button
            className={`bg-gray-200 text-black py-2 px-4 rounded disabled:opacity-50 ${
              status === "executing" ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={status !== "executing"}
            onClick={() => {
              if (respond) {
                setAccepted(false);
                onReject();
                respond({ accepted: false });
              }
            }}
          >
            Reject
          </button>
          <button
            className={`bg-black text-white py-2 px-4 rounded disabled:opacity-50 ${
              status === "executing" ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={status !== "executing"}
            onClick={() => {
              if (respond) {
                setAccepted(true);
                onConfirm();
                respond({ accepted: true });
              }
            }}
          >
            Confirm
          </button>
        </div>
      )}
      {accepted !== null && (
        <div className="flex justify-end">
          <div className="mt-4 bg-gray-200 text-black py-2 px-4 rounded inline-block">
            {accepted ? "✓ Accepted" : "✗ Rejected"}
          </div>
        </div>
      )}
    </div>
  );
}

// Document editor component with diff visualization
function DocumentEditor({ agentId }: { agentId: string }) {
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "min-h-screen p-10" },
    },
  });
  
  const [placeholderVisible, setPlaceholderVisible] = useState(false);
  const [currentDocument, setCurrentDocument] = useState("");
  const { isLoading } = useCopilotChat();

  const {
    state: agentState,
    setState: setAgentState,
    nodeName,
  } = useCoAgent<AgentState>({
    name: agentId,
    initialState: {
      document: "",
    },
  });

  useEffect(() => {
    if (isLoading) {
      setCurrentDocument(editor?.getText() || "");
    }
    editor?.setEditable(!isLoading);
  }, [isLoading, editor]);

  useEffect(() => {
    if (nodeName === "end") {
      // Set the text one final time when loading is done
      if (currentDocument.trim().length > 0 && currentDocument !== agentState?.document) {
        const newDocument = agentState?.document || "";
        const diff = diffPartialText(currentDocument, newDocument, true);
        const markdown = fromMarkdown(diff);
        editor?.commands.setContent(markdown);
      }
    }
  }, [nodeName, currentDocument, agentState?.document, editor]);

  useEffect(() => {
    if (isLoading) {
      if (currentDocument.trim().length > 0) {
        const newDocument = agentState?.document || "";
        const diff = diffPartialText(currentDocument, newDocument);
        const markdown = fromMarkdown(diff);
        editor?.commands.setContent(markdown);
      } else {
        const markdown = fromMarkdown(agentState?.document || "");
        editor?.commands.setContent(markdown);
      }
    }
  }, [agentState?.document, isLoading, currentDocument, editor]);

  const text = editor?.getText() || "";

  useEffect(() => {
    setPlaceholderVisible(text.length === 0);

    if (!isLoading) {
      setCurrentDocument(text);
      setAgentState({
        document: text,
      });
    }
  }, [text, isLoading, setAgentState]);

  // Action to write the document with confirmation UI
  useCopilotAction({
    name: "write_document",
    description: "Present the proposed changes to the user for review",
    parameters: [
      {
        name: "document",
        type: "string",
        description: "The full updated document in markdown format",
      },
    ],
    renderAndWaitForResponse({ args, status, respond }) {
      if (status === "executing") {
        return (
          <ConfirmChanges
            args={args}
            respond={respond}
            status={status}
            onReject={() => {
              editor?.commands.setContent(fromMarkdown(currentDocument));
              setAgentState({ document: currentDocument });
            }}
            onConfirm={() => {
              editor?.commands.setContent(fromMarkdown(agentState?.document || ""));
              setCurrentDocument(agentState?.document || "");
              setAgentState({ document: agentState?.document || "" });
            }}
          />
        );
      }
      return null;
    },
  });

  return (
    <div className="relative min-h-screen w-full">
      {placeholderVisible && (
        <div className="absolute top-6 left-6 m-4 pointer-events-none text-gray-400">
          Write whatever you want here in Markdown format...
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// Helper functions for markdown and diff processing
function fromMarkdown(text: string) {
  const md = new (MarkdownIt as any)({
    typographer: true,
    html: true,
  });
  return md.render(text);
}

function diffPartialText(oldText: string, newText: string, isComplete: boolean = false) {
  let oldTextToCompare = oldText;
  if (oldText.length > newText.length && !isComplete) {
    // Make oldText shorter
    oldTextToCompare = oldText.slice(0, newText.length);
  }

  const changes = diffWords(oldTextToCompare, newText);

  let result = "";
  changes.forEach((part) => {
    if (part.added) {
      result += `<em>${part.value}</em>`;
    } else if (part.removed) {
      result += `<s>${part.value}</s>`;
    } else {
      result += part.value;
    }
  });

  if (oldText.length > newText.length && !isComplete) {
    result += oldText.slice(newText.length);
  }

  return result;
}

export default function PredictiveStateUpdates({ agentId, agentName }: PredictiveStateUpdatesProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <div className="min-h-screen w-full">
        <CopilotSidebar
          defaultOpen={true}
          labels={{
            title: "AI Document Editor",
            initial: "Hi 👋 How can I help with your document?",
          }}
          clickOutsideToClose={false}
        >
          <DocumentEditor agentId={agentId} />
        </CopilotSidebar>
      </div>
    </CopilotKit>
  );
}