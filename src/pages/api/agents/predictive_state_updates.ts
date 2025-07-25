import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface DocumentDiff {
  type: 'addition' | 'deletion' | 'modification';
  line: number;
  content: string;
  preview?: string;
}

interface DocumentState {
  document: string;
  diffs: DocumentDiff[];
  isStreaming: boolean;
  version: number;
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
    documentState?: DocumentState;
    action?: string;
  };
}

// Generate document content with predictive updates
function generateDocumentWithDiffs(userMessage: string): DocumentState {
  const lowerMessage = userMessage.toLowerCase();
  
  let baseDocument = '';
  let diffs: DocumentDiff[] = [];
  
  if (lowerMessage.includes('letter') || lowerMessage.includes('email')) {
    baseDocument = `Dear [Recipient],

I hope this message finds you well. I am writing to...

[This document is being collaboratively edited in real-time]

Best regards,
[Your Name]`;
    
    diffs = [
      {
        type: 'modification',
        line: 1,
        content: 'Dear Sarah,',
        preview: 'Personalizing the greeting...'
      },
      {
        type: 'addition',
        line: 3,
        content: 'I hope this message finds you well. I am writing to discuss our upcoming project collaboration and wanted to share some initial thoughts.',
        preview: 'Adding context about the project...'
      },
      {
        type: 'modification',
        line: 7,
        content: 'Best regards,\nAlex Johnson',
        preview: 'Adding signature...'
      }
    ];
  } else if (lowerMessage.includes('code') || lowerMessage.includes('function')) {
    baseDocument = `// Collaborative function development
function processData(input) {
  // TODO: Add validation
  
  return result;
}`;
    
    diffs = [
      {
        type: 'addition',
        line: 3,
        content: '  if (!input || typeof input !== "object") {\n    throw new Error("Invalid input");\n  }',
        preview: 'Adding input validation...'
      },
      {
        type: 'addition',
        line: 4,
        content: '  \n  const result = input.map(item => item.value * 2);',
        preview: 'Implementing core logic...'
      }
    ];
  } else if (lowerMessage.includes('article') || lowerMessage.includes('blog')) {
    baseDocument = `# The Future of Collaborative Writing

## Introduction
In today's digital age, collaborative writing has become...

## Key Benefits
- Real-time collaboration
- Version control
- [Content being added...]

## Conclusion
[To be completed]`;
    
    diffs = [
      {
        type: 'modification',
        line: 4,
        content: 'In today\'s digital age, collaborative writing has become essential for teams working on complex documents. The ability to see changes in real-time transforms how we create content together.',
        preview: 'Expanding introduction...'
      },
      {
        type: 'addition',
        line: 8,
        content: '- Instant feedback loops\n- Reduced conflicts\n- Enhanced creativity through diverse input',
        preview: 'Adding more benefits...'
      }
    ];
  } else {
    // Default document
    baseDocument = `# Collaborative Document

This document demonstrates real-time collaborative editing with predictive state updates.

## Features
- Live editing
- Diff visualization
- [Being updated...]

## Status
Work in progress`;
    
    diffs = [
      {
        type: 'modification',
        line: 8,
        content: '- Character-by-character streaming\n- Conflict resolution\n- Multi-user synchronization',
        preview: 'Enhancing features list...'
      },
      {
        type: 'modification',
        line: 11,
        content: 'Nearly complete - adding final touches',
        preview: 'Updating status...'
      }
    ];
  }
  
  return {
    document: baseDocument,
    diffs: diffs,
    isStreaming: true,
    version: 1
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse | { error: string }>) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { messages }: ChatRequest = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    
    // Get the latest user message
    const userMessage = messages
      .reverse()
      .find(msg => msg.role === 'user')?.content || 'Create a collaborative document';
    
    // Generate document with predictive updates
    const documentState = generateDocumentWithDiffs(userMessage);
    
    const responseContent = `I'm creating a collaborative document with real-time predictive updates! Watch as the document evolves character by character with live diff visualization. You can see exactly what changes are being made and where.

📝 **Live Document Editor:**
The document below shows real-time changes with diff highlighting and predictive text updates.`;

    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed',
        documentState: documentState,
        action: 'show_predictive_document'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}