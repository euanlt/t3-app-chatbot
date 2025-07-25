import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface ProgressStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
    progressSteps?: ProgressStep[];
    action?: string;
  };
}

// Simulate long-running task with progress updates
function generateProgressSteps(taskType: string): ProgressStep[] {
  if (taskType.includes('deploy') || taskType.includes('build')) {
    return [
      { id: '1', title: 'Installing dependencies', status: 'completed', progress: 100, message: '✅ All packages installed' },
      { id: '2', title: 'Running build process', status: 'completed', progress: 100, message: '✅ Build completed successfully' },
      { id: '3', title: 'Running tests', status: 'in_progress', progress: 65, message: '🧪 Running test suite...' },
      { id: '4', title: 'Deploying to production', status: 'pending', progress: 0 },
      { id: '5', title: 'Verifying deployment', status: 'pending', progress: 0 },
    ];
  }
  
  if (taskType.includes('data') || taskType.includes('analysis')) {
    return [
      { id: '1', title: 'Loading dataset', status: 'completed', progress: 100, message: '✅ 10,000 records loaded' },
      { id: '2', title: 'Data preprocessing', status: 'completed', progress: 100, message: '✅ Cleaned and normalized' },
      { id: '3', title: 'Feature extraction', status: 'in_progress', progress: 80, message: '🔍 Extracting patterns...' },
      { id: '4', title: 'Model training', status: 'pending', progress: 0 },
      { id: '5', title: 'Generating insights', status: 'pending', progress: 0 },
    ];
  }
  
  if (taskType.includes('file') || taskType.includes('process')) {
    return [
      { id: '1', title: 'Scanning directories', status: 'completed', progress: 100, message: '✅ Found 247 files' },
      { id: '2', title: 'Processing files', status: 'in_progress', progress: 45, message: '📁 Processing batch 2/5...' },
      { id: '3', title: 'Applying transformations', status: 'pending', progress: 0 },
      { id: '4', title: 'Validating results', status: 'pending', progress: 0 },
      { id: '5', title: 'Generating report', status: 'pending', progress: 0 },
    ];
  }
  
  // Generic long-running task
  return [
    { id: '1', title: 'Initializing task', status: 'completed', progress: 100, message: '✅ Setup complete' },
    { id: '2', title: 'Processing request', status: 'in_progress', progress: 35, message: '⚙️ Working on it...' },
    { id: '3', title: 'Optimizing results', status: 'pending', progress: 0 },
    { id: '4', title: 'Quality check', status: 'pending', progress: 0 },
    { id: '5', title: 'Finalizing output', status: 'pending', progress: 0 },
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
      .find(msg => msg.role === 'user')?.content || 'Start a long-running task';
    
    // Generate progress steps based on the task type
    const progressSteps = generateProgressSteps(userMessage.toLowerCase());
    
    const responseContent = `I'm starting your task and will provide real-time progress updates. You can see the current status of each step below. The system will automatically update as work progresses.

🚀 **Task Status:**
Monitor the progress in real-time as I work through each step of your request.`;

    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed',
        progressSteps: progressSteps,
        action: 'show_progress_tracking'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}