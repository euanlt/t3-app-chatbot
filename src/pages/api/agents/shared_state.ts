import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface Ingredient {
  icon: string;
  name: string;
  amount: string;
}

interface Recipe {
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  special_preferences: string[];
  cooking_time: '5 min' | '15 min' | '30 min' | '45 min' | '60+ min';
  ingredients: Ingredient[];
  instructions: string[];
}

interface ChatResponse {
  type: 'agent_response';
  data: {
    content: string;
    status: 'completed';
    recipe?: Recipe;
    action?: string;
  };
}

// Generate recipe based on user preferences
function generateRecipe(userMessage: string): Recipe {
  const lowerMessage = userMessage.toLowerCase();
  
  // Detect cuisine type and preferences
  let ingredients: Ingredient[] = [];
  let instructions: string[] = [];
  let skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
  let cookingTime: '5 min' | '15 min' | '30 min' | '45 min' | '60+ min' = '15 min';
  let preferences: string[] = [];
  
  if (lowerMessage.includes('pasta') || lowerMessage.includes('italian')) {
    ingredients = [
      { icon: '🍝', name: 'Spaghetti', amount: '200g' },
      { icon: '🍅', name: 'Crushed tomatoes', amount: '400g can' },
      { icon: '🧄', name: 'Garlic', amount: '3 cloves' },
      { icon: '🌿', name: 'Fresh basil', amount: '1/4 cup' },
      { icon: '🧀', name: 'Parmesan cheese', amount: '50g' },
      { icon: '🫒', name: 'Olive oil', amount: '2 tbsp' }
    ];
    instructions = [
      'Bring a large pot of salted water to boil',
      'Heat olive oil in a pan and sauté minced garlic until fragrant',
      'Add crushed tomatoes and simmer for 10 minutes',
      'Cook spaghetti according to package directions until al dente',
      'Drain pasta and add to the tomato sauce',
      'Toss with fresh basil and serve with grated Parmesan'
    ];
    cookingTime = '30 min';
  } else if (lowerMessage.includes('salad') || lowerMessage.includes('healthy')) {
    ingredients = [
      { icon: '🥬', name: 'Mixed greens', amount: '4 cups' },
      { icon: '🥕', name: 'Cherry tomatoes', amount: '1 cup' },
      { icon: '🥒', name: 'Cucumber', amount: '1 medium' },
      { icon: '🥑', name: 'Avocado', amount: '1 ripe' },
      { icon: '🌰', name: 'Walnuts', amount: '1/4 cup' },
      { icon: '🫒', name: 'Olive oil', amount: '3 tbsp' },
      { icon: '🍋', name: 'Lemon juice', amount: '2 tbsp' }
    ];
    instructions = [
      'Wash and dry the mixed greens thoroughly',
      'Dice the cucumber and halve the cherry tomatoes',
      'Slice the avocado just before serving',
      'Roughly chop the walnuts',
      'Whisk together olive oil and lemon juice for dressing',
      'Combine all ingredients and toss with dressing just before serving'
    ];
    preferences = ['Vegetarian', 'Low Carb'];
    cookingTime = '15 min';
  } else if (lowerMessage.includes('quick') || lowerMessage.includes('fast')) {
    ingredients = [
      { icon: '🥪', name: 'Bread slices', amount: '4 slices' },
      { icon: '🧀', name: 'Cheese', amount: '4 slices' },
      { icon: '🍅', name: 'Tomato', amount: '1 medium' },
      { icon: '🥬', name: 'Lettuce', amount: '4 leaves' },
      { icon: '🧈', name: 'Butter', amount: '2 tbsp' }
    ];
    instructions = [
      'Slice the tomato into rounds',
      'Wash and dry the lettuce leaves',
      'Butter one side of each bread slice',
      'Layer cheese, tomato, and lettuce between bread',
      'Toast in a pan until golden and cheese melts'
    ];
    preferences = ['Budget-Friendly'];
    cookingTime = '5 min';
  } else {
    // Default recipe
    ingredients = [
      { icon: '🥚', name: 'Eggs', amount: '3 large' },
      { icon: '🧈', name: 'Butter', amount: '1 tbsp' },
      { icon: '🧀', name: 'Cheddar cheese', amount: '50g grated' },
      { icon: '🧂', name: 'Salt', amount: 'to taste' },
      { icon: '🌶️', name: 'Black pepper', amount: 'to taste' }
    ];
    instructions = [
      'Crack eggs into a bowl and whisk with salt and pepper',
      'Heat butter in a non-stick pan over medium-low heat',
      'Pour in eggs and let them set for 30 seconds',
      'Gently stir with a spatula, pushing eggs from edges to center',
      'When eggs are almost set, add cheese and fold omelette in half',
      'Slide onto plate and serve immediately'
    ];
    skillLevel = 'Intermediate';
    cookingTime = '15 min';
  }
  
  // Detect dietary preferences
  if (lowerMessage.includes('vegetarian')) preferences.push('Vegetarian');
  if (lowerMessage.includes('vegan')) preferences.push('Vegan');
  if (lowerMessage.includes('spicy')) preferences.push('Spicy');
  if (lowerMessage.includes('protein')) preferences.push('High Protein');
  if (lowerMessage.includes('low carb')) preferences.push('Low Carb');
  
  return {
    skill_level: skillLevel,
    special_preferences: preferences,
    cooking_time: cookingTime,
    ingredients,
    instructions
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
      .find(msg => msg.role === 'user')?.content || 'Create a simple recipe';
    
    // Generate recipe based on user input
    const recipe = generateRecipe(userMessage);
    
    const responseContent = `I've created a delicious recipe based on your preferences! The recipe form below is fully interactive - you can modify ingredients, cooking time, and instructions in real-time. Any changes you make will be synchronized with our conversation.

👨‍🍳 **Interactive Recipe Builder:**
Customize this recipe to your liking using the controls below.`;

    const response: ChatResponse = {
      type: 'agent_response',
      data: {
        content: responseContent,
        status: 'completed',
        recipe: recipe,
        action: 'show_shared_state_recipe'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}