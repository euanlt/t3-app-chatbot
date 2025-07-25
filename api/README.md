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

Each agent endpoint accepts POST requests with AG-UI protocol format:

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

// Response is Server-Sent Events stream
const reader = response.body.getReader();
// ... handle streaming response
```

## Adding New Agents

1. Create a new `.py` file in `/api/agents/`
2. Import the base handler: `from _base import create_agent_handler`
3. Define your PydanticAI agent with tools
4. Export the handler: `handler = create_agent_handler(your_agent)`
5. Add main function for Vercel: `def main(event, context): return asyncio.run(handler(event, context))`
6. Update the frontend agent list in `src/server/api/routers/agents.ts`

## Local Development

For local testing:
```bash
# Install Python dependencies
cd api && pip install -r requirements.txt

# Run a test
python -c "
import asyncio
from agents.agentic_chat import handler

event = {
    'httpMethod': 'POST',
    'body': '{\"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}]}'
}
print(asyncio.run(handler(event, {})))
"
```

## Architecture

- **Base Handler** (`_base.py`): Wraps PydanticAI agents for Vercel serverless
- **AG-UI Protocol**: Maintains compatibility with the AG-UI frontend protocol
- **Streaming**: Uses Server-Sent Events for real-time agent responses
- **Serverless**: Each agent is a separate Vercel function with ~30s timeout