"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { CopilotKit, useCoAgent, useCopilotAction, useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { diffWords } from "diff";
import MarkdownIt from "markdown-it";

interface PredictiveStateUpdatesProps {
  agentId: string;
  agentName: string;
}

interface AgentState {
  document: string;
}

const extensions = [StarterKit];

// Function to extract document content from agent messages
function extractDocumentFromMessage(content: string, userMessage?: string): string | null {
  try {
    console.log("Extracting document from message:", content.substring(0, 200) + "...");
    
    // Look for markdown code blocks first - these are always document content
    // Match ```markdown, ```md, or just ```
    // Try multiple regex patterns to catch different formats
    const patterns = [
      /```markdown\s*\n([\s\S]*?)\n```/,  // ```markdown
      /```md\s*\n([\s\S]*?)\n```/,        // ```md
      /```\s*\n([\s\S]*?)\n```/,          // just ```
      /```([\s\S]*?)```/                   // minimal format
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        console.log("Found code block with pattern:", pattern.source);
        return match[1].trim();
      }
    }
    
    // Check if this looks like substantial structured content
    const lines = content.split('\n');
    let documentLines = [];
    let hasStructuredContent = false;
    
    for (const line of lines) {
      // Detect markdown structures
      if (line.match(/^#{1,6}\s+/) || // Headers
          line.match(/^[-*+]\s+/) ||   // Unordered lists
          line.match(/^\d+\.\s+/) ||    // Ordered lists
          line.match(/^>\s+/) ||        // Blockquotes
          line.match(/^\*\*.*\*\*/) ||  // Bold text
          line.match(/^\*.*\*/) ||      // Italic text
          line.match(/^---+$/)) {       // Horizontal rules
        hasStructuredContent = true;
      }
      documentLines.push(line);
    }
    
    // If we have structured markdown content and it's substantial, consider it document content
    if (hasStructuredContent && documentLines.length > 3) {
      // Remove common chat prefixes if present
      let cleanedContent = documentLines.join('\n');
      cleanedContent = cleanedContent
        .replace(/^(Here's|Here is|I've written|I've created|I've completed|I'll continue).*?:\n\n/i, '')
        .replace(/^(The completed story|The continuation|The document).*?:\n\n/i, '')
        .trim();
      
      return cleanedContent;
    }
    
    // If the content is long and looks like prose/story (paragraphs), extract it
    if (content.length > 200) {
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
      if (paragraphs.length >= 2) {
        // Remove conversational prefixes
        let cleanedContent = content
          .replace(/^(Here's|Here is|I've written|I've created|I've completed|I'll continue).*?:\n\n/i, '')
          .replace(/^(The completed story|The continuation|The document).*?:\n\n/i, '')
          .trim();
        
        console.log("Extracted as prose/story content");
        return cleanedContent;
      }
    }
    
    // Last resort: if user asked for completion and response mentions updating/continuing
    // but no code block found, assume the whole response is document content
    if (userMessage === 'document' && content.length > 100) {
      console.log("Using fallback extraction for completion request");
      // Remove common prefixes
      let cleanedContent = content
        .replace(/^(I've|I have|Here's|Here is|The).*?(updated|continued|completed|added|written).*?[:\.]\s*/i, '')
        .trim();
      
      if (cleanedContent.length > 50) {
        return cleanedContent;
      }
    }
    
    console.log("No document content found in message");
    return null;
  } catch (error) {
    console.error("Error extracting document from message:", error);
    return null;
  }
}

// Component for confirming changes
function ConfirmChanges({ 
  currentDocument, 
  proposedDocument,
  onConfirm,
  onReject
}: { 
  currentDocument: string;
  proposedDocument: string;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  
  // Generate diff visualization
  const diffHtml = React.useMemo(() => {
    const changes = diffWords(currentDocument || '', proposedDocument || '');
    
    return changes.map((part, index) => {
      if (part.added) {
        return (
          <span key={index} className="bg-green-200 text-green-900 font-medium">
            {part.value}
          </span>
        );
      } else if (part.removed) {
        return (
          <span key={index} className="bg-red-200 text-red-900 line-through">
            {part.value}
          </span>
        );
      } else {
        return <span key={index}>{part.value}</span>;
      }
    });
  }, [currentDocument, proposedDocument]);
  
  return (
    <div className="bg-white p-6 rounded shadow-lg border border-gray-200 mt-5 mb-5">
      <h2 className="text-lg font-bold mb-4">Confirm Document Changes</h2>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Changes Preview:</h3>
        <div className="bg-gray-50 p-4 rounded text-sm max-h-64 overflow-y-auto border border-gray-200">
          <div className="whitespace-pre-wrap">
            {diffHtml}
          </div>
        </div>
        
        <div className="flex gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-green-200 border border-green-300 rounded"></span>
            <span>Added</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-red-200 border border-red-300 rounded"></span>
            <span>Removed</span>
          </div>
        </div>
      </div>
      
      {accepted === null && (
        <div className="flex justify-end space-x-4">
          <button
            className="bg-gray-200 text-black py-2 px-4 rounded hover:bg-gray-300 transition-colors"
            onClick={() => {
              setAccepted(false);
              onReject();
            }}
          >
            Reject
          </button>
          <button
            className="bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
            onClick={() => {
              setAccepted(true);
              onConfirm();
            }}
          >
            Accept Changes
          </button>
        </div>
      )}
      {accepted !== null && (
        <div className="flex justify-end">
          <div className="mt-4 bg-gray-200 text-black py-2 px-4 rounded inline-block">
            {accepted ? "✓ Changes Accepted" : "✗ Changes Rejected"}
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
  const { isLoading, appendMessage, messages, setMessages } = useCopilotChat();
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [confirmationUI, setConfirmationUI] = useState<{ show: boolean; proposedDocument: string } | null>(null);

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
    // Hide placeholder immediately when there's any text
    setPlaceholderVisible(!text || text.length === 0);
  }, [text]);

  useEffect(() => {
    if (!isLoading && text !== currentDocument) {
      setCurrentDocument(text);
      setAgentState({
        document: text,
      });
      console.log("Updated agent state with document:", text);
    }
  }, [text, isLoading, currentDocument, setAgentState]);

  // Auto-pass document content to chat and extract changes from responses
  useEffect(() => {
    if (messages && messages.length > lastMessageCount) {
      const newMessages = messages.slice(lastMessageCount);
      let lastUserMessage = '';
      
      for (const message of newMessages) {
        if (message.role === 'user') {
          // Track the user's message for context
          lastUserMessage = message.content || '';
          console.log("User message:", lastUserMessage);
          console.log("Current document in editor:", currentDocument);
        } else if (message.role === 'assistant' && message.content) {
          console.log("Assistant message received, checking for document content");
          console.log("Message content preview:", message.content.substring(0, 300));
          
          // Always try to extract document content when user asks for completion/continuation
          const isCompletionRequest = lastUserMessage && (
            lastUserMessage.toLowerCase().includes('complete') ||
            lastUserMessage.toLowerCase().includes('continue') ||
            lastUserMessage.toLowerCase().includes('finish') ||
            lastUserMessage.toLowerCase().includes('add') ||
            lastUserMessage.toLowerCase().includes('write') ||
            lastUserMessage.toLowerCase().includes('more') ||
            lastUserMessage.toLowerCase().includes('story') ||
            lastUserMessage.toLowerCase().includes('document')
          );
          
          console.log("Is completion request:", isCompletionRequest);
          
          // Extract content if it looks like document content or user asked for completion
          const extractedContent = extractDocumentFromMessage(message.content, isCompletionRequest ? 'document' : lastUserMessage);
          
          if (extractedContent) {
            console.log("Extracted document content from message:", extractedContent);
            console.log("Current document:", currentDocument);
            console.log("Content differs:", extractedContent !== currentDocument);
            
            // Show confirmation UI for the proposed changes (even if same, user might want to review)
            console.log("Document changes detected, showing confirmation UI");
            setConfirmationUI({ 
              show: true, 
              proposedDocument: extractedContent 
            });
          } else {
            console.log("No document content extracted from message");
          }
        }
      }
      
      setLastMessageCount(messages.length);
    }
  }, [messages, lastMessageCount, currentDocument, setConfirmationUI]);

  // Make document content readable to the AI
  useCopilotReadable({
    description: "Current document content in the editor",
    value: currentDocument || "[Document is empty]",
  });
  
  // Log when document changes
  useEffect(() => {
    console.log("Document readable context updated:", currentDocument);
  }, [currentDocument]);

  // Function to handle document confirmation
  const handleDocumentConfirmation = (accepted: boolean, proposedDocument: string) => {
    if (accepted) {
      const markdown = fromMarkdown(proposedDocument);
      editor?.commands.setContent(markdown);
      setCurrentDocument(proposedDocument);
      setAgentState({ document: proposedDocument });
    } else {
      // Revert to current document
      const markdown = fromMarkdown(currentDocument);
      editor?.commands.setContent(markdown);
    }
    setConfirmationUI(null);
  };

  return (
    <div className="relative min-h-screen w-full">
      {placeholderVisible && (
        <div className="absolute top-6 left-6 m-4 pointer-events-none text-gray-400">
          Write whatever you want here in Markdown format...
        </div>
      )}
      <EditorContent editor={editor} />
      
      {/* Confirmation UI overlay */}
      {confirmationUI?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-2xl w-full mx-4">
            <ConfirmChanges
              currentDocument={currentDocument}
              proposedDocument={confirmationUI.proposedDocument}
              onConfirm={() => handleDocumentConfirmation(true, confirmationUI.proposedDocument)}
              onReject={() => handleDocumentConfirmation(false, confirmationUI.proposedDocument)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for markdown and diff processing
function fromMarkdown(text: string) {
  const md = new MarkdownIt({
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