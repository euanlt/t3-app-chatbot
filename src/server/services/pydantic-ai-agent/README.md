# Pydantic AI Agent Service

This service provides Pydantic AI agents with AG-UI protocol support for the T3 app chatbot.

## Setup

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
# or from project root: npm run agents:install
```

3. Set up environment variables:
Create a `.env` file with:
```
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o
```

## Running the Service

From the project root:
```bash
npm run agents:start
```

Or directly:
```bash
python -m pydantic-ai-agent
```

The service will start on http://localhost:9000

## Available Agents

- `/agentic_chat` - Basic conversational agent with tools
- `/human_in_the_loop` - Interactive task planning with approval
- `/agentic_generative_ui` - Long-running tasks with progress
- `/tool_based_generative_ui` - Rich content generation (haikus, recipes, code)
- `/shared_state` - Bidirectional state synchronization
- `/predictive_state_updates` - Real-time collaborative editing

## Architecture

Each agent is a Pydantic AI agent converted to AG-UI protocol using `.to_ag_ui()`.
The agents stream events using Server-Sent Events (SSE) following the AG-UI protocol specification.