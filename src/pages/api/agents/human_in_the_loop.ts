import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
    tasks?: TaskStep[];
    action?: string;
  };
}

// Generate task breakdown for user approval
function generateTaskSteps(userMessage: string): TaskStep[] {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('website') || lowerMessage.includes('web')) {
    return [
      { id: '1', description: 'Create wireframes and design mockups', status: 'pending', priority: 'high' },
      { id: '2', description: 'Set up project structure and dependencies', status: 'pending', priority: 'high' },
      { id: '3', description: 'Implement responsive layout', status: 'pending', priority: 'medium' },
      { id: '4', description: 'Add interactive features and animations', status: 'pending', priority: 'medium' },
      { id: '5', description: 'Test across different browsers and devices', status: 'pending', priority: 'low' },
    ];
  }
  
  if (lowerMessage.includes('app') || lowerMessage.includes('mobile')) {
    return [
      { id: '1', description: 'Define app requirements and user flows', status: 'pending', priority: 'high' },
      { id: '2', description: 'Create UI/UX design system', status: 'pending', priority: 'high' },
      { id: '3', description: 'Set up development environment', status: 'pending', priority: 'medium' },
      { id: '4', description: 'Implement core functionality', status: 'pending', priority: 'medium' },
      { id: '5', description: 'Add testing and deployment pipeline', status: 'pending', priority: 'low' },
    ];
  }
  
  if (lowerMessage.includes('api') || lowerMessage.includes('backend')) {
    return [
      { id: '1', description: 'Design API endpoints and data models', status: 'pending', priority: 'high' },
      { id: '2', description: 'Set up database schema', status: 'pending', priority: 'high' },
      { id: '3', description: 'Implement authentication and authorization', status: 'pending', priority: 'medium' },
      { id: '4', description: 'Add error handling and validation', status: 'pending', priority: 'medium' },
      { id: '5', description: 'Create documentation and tests', status: 'pending', priority: 'low' },
    ];
  }
  
  // Generic task breakdown
  return [
    { id: '1', description: 'Research and analyze requirements', status: 'pending', priority: 'high' },
    { id: '2', description: 'Create initial plan and timeline', status: 'pending', priority: 'high' },
    { id: '3', description: 'Implement core features', status: 'pending', priority: 'medium' },
    { id: '4', description: 'Test and refine implementation', status: 'pending', priority: 'medium' },
    { id: '5', description: 'Review and finalize deliverables', status: 'pending', priority: 'low' },
  ];
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
      .find(msg => msg.role === 'user')?.content || 'Help me plan a project';
    
    // Generate task breakdown
    const tasks = generateTaskSteps(userMessage);
    
    const responseContent = `I've analyzed your request and broken it down into manageable tasks. Please review the task list below and let me know which ones you'd like me to help with. You can approve or reject individual tasks, and I'll focus on the ones you approve.

🎯 **Task Breakdown:**
Each task has been prioritized to help you make informed decisions about what to tackle first.`;

    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed',
        tasks: tasks,
        action: 'show_task_breakdown'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}