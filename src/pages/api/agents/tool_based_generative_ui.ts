import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface GeneratedContent {
  type: 'haiku' | 'poem' | 'story' | 'recipe' | 'code' | 'design';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
    generatedContent?: GeneratedContent;
    action?: string;
  };
}

// Generate structured content based on user request
function generateStructuredContent(userMessage: string): GeneratedContent {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('haiku')) {
    return {
      type: 'haiku',
      title: 'Digital Serenity',
      content: `Code flows like water,
Silent pixels dance on screen—
Beauty in logic.`,
      metadata: {
        syllables: [5, 7, 5],
        theme: 'technology',
        mood: 'peaceful'
      }
    };
  }
  
  if (lowerMessage.includes('poem')) {
    return {
      type: 'poem',
      title: 'The Developer\'s Journey',
      content: `In the quiet hours before dawn breaks,
A developer sits with coffee and code,
Building worlds from thoughts and syntax,
Where logic and creativity collode.

Each function a brushstroke,
Each variable a color bright,
Crafting digital masterpieces
That bring ideas to light.`,
      metadata: {
        stanzas: 2,
        verses_per_stanza: 4,
        rhyme_scheme: 'ABAB'
      }
    };
  }
  
  if (lowerMessage.includes('story')) {
    return {
      type: 'story',
      title: 'The Bug That Changed Everything',
      content: `Sarah stared at the error message, her coffee growing cold. Three days she'd been hunting this bug, and it seemed to mock her from the screen. But as she traced through the code one more time, she noticed something strange—a pattern she'd never seen before.

The bug wasn't random. It was deliberate, elegant even. Someone had hidden a message in the seemingly broken code, a digital treasure hunt that would lead to the discovery of a lifetime.

Her fingers flew across the keyboard as she began to decode the secret, unaware that her life was about to change forever.`,
      metadata: {
        word_count: 97,
        genre: 'mystery',
        reading_time: '30 seconds'
      }
    };
  }
  
  if (lowerMessage.includes('recipe')) {
    return {
      type: 'recipe',
      title: 'Perfect Code Pancakes',
      content: `**Ingredients:**
• 2 cups of clean syntax
• 1 cup of well-structured logic
• 3 eggs of creative thinking
• 1/2 cup of debugging patience
• A pinch of artistic flair

**Instructions:**
1. Sift the syntax until smooth and readable
2. Whisk the logic until it flows naturally
3. Gently fold in the creative thinking
4. Cook on medium heat with steady debugging
5. Serve with a generous helping of satisfaction

*Serves: One fulfilled developer*`,
      metadata: {
        prep_time: '15 minutes',
        cook_time: '20 minutes',
        difficulty: 'Intermediate'
      }
    };
  }
  
  if (lowerMessage.includes('code')) {
    return {
      type: 'code',
      title: 'Elegant Hello World',
      content: `// A thoughtful approach to the classic
class Greeting {
  constructor(private message: string) {}
  
  display(): void {
    console.log(\`✨ \${this.message} ✨\`);
  }
}

const hello = new Greeting("Hello, Beautiful World!");
hello.display();`,
      metadata: {
        language: 'TypeScript',
        lines: 9,
        concepts: ['classes', 'private fields', 'template literals']
      }
    };
  }
  
  // Default to haiku
  return {
    type: 'haiku',
    title: 'Inspiration Flows',
    content: `Words form like dewdrops,
Each thought a gentle whisper—
Creativity blooms.`,
    metadata: {
      syllables: [5, 7, 5],
      theme: 'creativity',
      mood: 'inspiring'
    }
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
      .find(msg => msg.role === 'user')?.content || 'Create something beautiful';
    
    // Generate structured content
    const generatedContent = generateStructuredContent(userMessage);
    
    const responseContent = `I've created a beautiful ${generatedContent.type} for you! The content is elegantly formatted and ready to inspire. Each piece is crafted with attention to detail and artistic flair.

🎨 **Generated Content:**
Your custom ${generatedContent.type} is displayed below with rich formatting and metadata.`;

    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed',
        generatedContent: generatedContent,
        action: 'show_generated_content'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}