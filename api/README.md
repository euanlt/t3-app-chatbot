# PydanticAI Agents on Vercel

This directory contains PydanticAI agents deployed as Vercel serverless functions.

## Setup

1. **Environment Variables**: Add to your Vercel project or `.env.local`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Deploy to Vercel**: The agents are automatically deployed when you push to your main branch.

## Available Agents

### Agentic Chat (`/api/agents/agentic_chat`)
Basic chat agent with tools:
- Get current time
- Set background color (demo tool)

### Weather Chat (`/api/agents/weather_chat`)
Weather assistant agent with tools:
- Get weather for any location (mock data)
- Get current time

## Usage

Each agent endpoint accepts POST requests:

```typescript
// Frontend usage (already integrated)
const response = await fetch('/api/agents/agentic_chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello! What time is it?' }
    ]
  })
});

// Response is JSON
const result = await response.json();
console.log(result.data.content); // Agent's response
```

## Adding New Agents

1. Create a new `.py` file in `/api/agents/`
2. Use the `BaseHTTPRequestHandler` pattern (see existing agents)
3. Define your PydanticAI agent with tools
4. Implement `do_POST` method to handle requests
5. Update the frontend agent list in `src/server/api/routers/agents.ts`

Example template:
```python
from http.server import BaseHTTPRequestHandler
import json, asyncio
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

model = OpenAIModel('gpt-4o-mini', api_key=os.getenv('OPENAI_API_KEY'))
agent = Agent(model, system_prompt="Your prompt here")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Handle request, run agent, return response
        pass
```

## Architecture

- **Vercel Python Runtime**: Uses `@vercel/python` runtime
- **HTTP Handler**: Each agent uses `BaseHTTPRequestHandler`
- **JSON Responses**: Simple request/response format
- **Serverless**: Each agent is a separate Vercel function with 30s timeout