import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
  };
}

// Mock agent responses for demo - replace with actual PydanticAI integration when Python runtime is fixed
const mockResponses = {
  time: () => `Current time: ${new Date().toISOString()}`,
  color: (color: string) => {
    const validColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black'];
    if (validColors.includes(color.toLowerCase())) {
      return `Background color set to ${color}! 🎨`;
    }
    return `Sorry, '${color}' is not a valid color. Available colors: ${validColors.join(', ')}`;
  },
  default: (message: string) => {
    // Simple keyword-based responses
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('time') || lowerMessage.includes('clock')) {
      return mockResponses.time();
    }
    
    if (lowerMessage.includes('color') || lowerMessage.includes('background')) {
      const colorMatch = lowerMessage.match(/(?:set|change|make).*?(?:background|color).*?(red|blue|green|yellow|purple|orange|pink|white|black)/);
      if (colorMatch && colorMatch[1]) {
        return mockResponses.color(colorMatch[1]);
      }
      return "What color would you like to set the background to? Available colors: red, blue, green, yellow, purple, orange, pink, white, black";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your AI assistant. I can help you check the time or change the background color. What would you like to do?";
    }
    
    if (lowerMessage.includes('help')) {
      return "I can help you with: ⏰ Getting the current time, 🎨 Setting background colors (red, blue, green, yellow, purple, orange, pink, white, black). Just ask me!";
    }
    
    return "I'm a helpful AI assistant! I can check the time or change background colors. Try asking me 'What time is it?' or 'Set the background to blue'.";
  }
};

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
      .find(msg => msg.role === 'user')?.content || 'Hello!';
    
    // Generate response using mock logic
    const responseContent = mockResponses.default(userMessage);
    
    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}