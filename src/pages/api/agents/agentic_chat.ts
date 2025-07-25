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
    action?: string;
    color?: string;
  };
}

// Helper functions for agent tools
function getCurrentTime(timezone?: string): string {
  if (!timezone) {
    return `Current time (UTC): ${new Date().toISOString()}`;
  }
  
  try {
    const now = new Date();
    const timeInTimezone = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);
    
    return `Current time in ${timezone}: ${timeInTimezone}`;
  } catch {
    return `Invalid timezone "${timezone}". Try timezones like: America/New_York, Europe/London, Asia/Tokyo, Australia/Sydney`;
  }
}

function setBackgroundColor(color: string): { action?: string; color?: string; message: string } {
  const validColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black', 'gray'];
  
  if (!validColors.includes(color.toLowerCase())) {
    return {
      message: `Sorry, '${color}' is not a valid color. Available colors: ${validColors.join(', ')}`
    };
  }
  
  return {
    action: 'set_background_color',
    color: color.toLowerCase(),
    message: `Background color set to ${color}! 🎨`
  };
}

// Mock agent responses for demo
const mockResponses = {
  time: (timezone?: string) => getCurrentTime(timezone),
  color: (color: string) => setBackgroundColor(color),
  default: (message: string): { message: string; action?: string; color?: string } => {
    // Simple keyword-based responses
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('time') || lowerMessage.includes('clock')) {
      // Extract timezone if mentioned
      const timezoneMatches = [
        { pattern: /(?:in|for)\s+(america\/new_york|new\s*york|eastern|est|edt)/i, timezone: 'America/New_York' },
        { pattern: /(?:in|for)\s+(europe\/london|london|gmt|utc|british)/i, timezone: 'Europe/London' },
        { pattern: /(?:in|for)\s+(asia\/tokyo|tokyo|japan|jst)/i, timezone: 'Asia/Tokyo' },
        { pattern: /(?:in|for)\s+(australia\/sydney|sydney|australia|aest)/i, timezone: 'Australia/Sydney' },
        { pattern: /(?:in|for)\s+(america\/los_angeles|los\s*angeles|pacific|pst|pdt)/i, timezone: 'America/Los_Angeles' },
        { pattern: /(?:in|for)\s+(europe\/paris|paris|france|cet)/i, timezone: 'Europe/Paris' },
      ];
      
      for (const { pattern, timezone } of timezoneMatches) {
        if (pattern.test(message)) {
          return { message: mockResponses.time(timezone) };
        }
      }
      
      return { message: mockResponses.time() };
    }
    
    if (lowerMessage.includes('color') || lowerMessage.includes('background')) {
      const colorMatch = lowerMessage.match(/(?:set|change|make).*?(?:background|color).*?(red|blue|green|yellow|purple|orange|pink|white|black|gray)/);
      if (colorMatch && colorMatch[1]) {
        const result = mockResponses.color(colorMatch[1]);
        return {
          message: result.message,
          action: result.action,
          color: result.color
        };
      }
      return { message: "What color would you like to set the background to? Available colors: red, blue, green, yellow, purple, orange, pink, white, black, gray" };
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return { message: "Hello! I'm your AI assistant. I can help you check the time in different timezones or change the background color. What would you like to do?" };
    }
    
    if (lowerMessage.includes('help')) {
      return { message: "I can help you with: ⏰ Getting the current time (try 'What time is it in Tokyo?'), 🎨 Setting background colors (red, blue, green, yellow, purple, orange, pink, white, black, gray). Just ask me!" };
    }
    
    return { message: "I'm a helpful AI assistant! I can check the time in different timezones or change background colors. Try asking me 'What time is it in New York?' or 'Set the background to blue'." };
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
        content: responseContent.message,
        status: 'completed',
        action: responseContent.action,
        color: responseContent.color
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}