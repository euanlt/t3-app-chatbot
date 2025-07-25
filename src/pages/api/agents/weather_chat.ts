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

// Mock weather data
const mockWeatherData: Record<string, { temp: number; condition: string; location: string }> = {
  'london': { temp: 15.2, condition: 'Partly cloudy', location: 'London, UK' },
  'new york': { temp: 22.8, condition: 'Sunny', location: 'New York, NY' },
  'tokyo': { temp: 18.5, condition: 'Overcast', location: 'Tokyo, Japan' },
  'sydney': { temp: 25.1, condition: 'Clear skies', location: 'Sydney, Australia' },
  'paris': { temp: 17.3, condition: 'Light rain', location: 'Paris, France' },
  'berlin': { temp: 12.8, condition: 'Cloudy', location: 'Berlin, Germany' },
  'moscow': { temp: 8.2, condition: 'Snow', location: 'Moscow, Russia' },
  'dubai': { temp: 34.5, condition: 'Hot and sunny', location: 'Dubai, UAE' }
};

function getWeather(location: string) {
  const locationKey = location.toLowerCase().trim();
  
  // Try to find matching location
  for (const [key, data] of Object.entries(mockWeatherData)) {
    if (key.includes(locationKey) || locationKey.includes(key)) {
      return data;
    }
  }
  
  // Default response for unknown locations
  return {
    temp: 20.0,
    condition: 'Data not available',
    location: location
  };
}

function generateWeatherResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for time requests
  if (lowerMessage.includes('time') || lowerMessage.includes('clock')) {
    return `Current time: ${new Date().toISOString()}`;
  }
  
  // Check for weather requests
  if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('forecast')) {
    // Extract location from message
    const locationMatch = lowerMessage.match(/(?:weather|temperature|forecast).*?(?:in|for|at)\s+([a-zA-Z\s]+)|([a-zA-Z\s]+)(?:\s+weather|\s+temperature)/);
    
    if (locationMatch) {
      const location = (locationMatch[1] || locationMatch[2])?.trim();
      if (location) {
        const weather = getWeather(location);
        return `🌤️ Weather in ${weather.location}: ${weather.temp}°C, ${weather.condition}. Is there anything else you'd like to know about the weather?`;
      }
    }
    
    // If no location specified, ask for it
    return "I'd be happy to help you with weather information! Which city would you like to know about? I have data for major cities like London, New York, Tokyo, Sydney, Paris, Berlin, Moscow, and Dubai.";
  }
  
  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your weather assistant. I can provide weather information for cities around the world, or tell you the current time. What would you like to know?";
  }
  
  // Help responses
  if (lowerMessage.includes('help')) {
    return "I can help you with: 🌤️ Weather information for cities worldwide, ⏰ Current time. Try asking 'What's the weather in London?' or 'What time is it?'";
  }
  
  // Default response
  return "I'm your weather assistant! Ask me about the weather in any city (like 'weather in Tokyo') or the current time. What would you like to know?";
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
      .find(msg => msg.role === 'user')?.content || 'Hello! How can I help you with weather information?';
    
    // Generate response
    const responseContent = generateWeatherResponse(userMessage);
    
    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Weather agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}