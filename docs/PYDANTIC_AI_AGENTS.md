# Pydantic AI Agents with AG-UI Protocol

This document explains how to run the Pydantic AI agents with the AG-UI protocol integration.

## Architecture Overview

The system consists of three main components:

1. **Python Backend Service** - Pydantic AI agents served via FastAPI with AG-UI protocol
2. **CopilotKit Runtime** - Next.js API route that connects to the Python backend
3. **React Frontend** - CopilotChat UI powered by CopilotKit

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- OpenAI API key

## Setup Instructions

### 1. Install Node.js Dependencies

From the project root:

```bash
npm install
```

### 2. Set Up Python Environment

Create and activate a Python virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install Python dependencies
npm run agents:install
```

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# Optional: Change the model
OPENAI_MODEL=gpt-4o-mini
```

### 4. Start the Services

You need to run both the Python backend and Next.js frontend:

**Terminal 1 - Python Backend:**
```bash
npm run agents:start
```

This starts the Pydantic AI agents on http://localhost:9000

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
```

This starts the Next.js app on http://localhost:3000

## Using the Agents

1. Open http://localhost:3000
2. Click on the "Agents" tab in the sidebar
3. Select an agent to chat with
4. The agent will open in the main chat area

## Available Agents

### 1. Agentic Chat
- Basic conversational AI with tools
- Can check time in any timezone: "What time is it in Tokyo?"
- Can change background color: "Change the background to blue"

### 2. Human in the Loop
- Interactive task planning
- Breaks down complex tasks
- Presents tasks for approval
- Example: "Help me build a website"

### 3. Agentic Generative UI
- Long-running tasks with progress
- Real-time progress visualization
- Example: "Deploy my application"

### 4. Tool Based Generative UI
- Creates rich content
- Generates haikus, recipes, code
- Example: "Write a haiku about coding"

### 5. Shared State
- Collaborative recipe builder
- Real-time state synchronization
- UI and agent share state
- Example: "Let's make pasta"

### 6. Predictive State Updates
- Real-time document editing
- Character-by-character updates
- Diff visualization
- Example: "Help me write a letter"

## How It Works

1. **Event Streaming**: Uses Server-Sent Events (SSE) for real-time communication
2. **AG-UI Protocol**: Standardized event format for AI-UI interactions
3. **Tool System**: Agents can execute tools that affect the UI
4. **State Management**: Some agents maintain shared state with the frontend

## Troubleshooting

### Python Backend Not Starting
- Check Python version: `python --version` (needs 3.8+)
- Ensure virtual environment is activated
- Check if port 9000 is available

### Agent Not Responding
- Verify OPENAI_API_KEY is set correctly
- Check Python backend logs for errors
- Ensure both services are running

### Background Color Not Changing
- This feature only works in the Agentic Chat agent
- Make sure to use valid color names or hex codes

## Development Tips

1. **Adding New Tools**: Edit the agent files in `src/server/services/pydantic-ai-agent/agents/`
2. **Modifying UI**: Update `src/app/_components/agents/AgentChat.tsx`
3. **Adding Client Actions**: Use `useCopilotAction` hook in the AgentChat component

## Architecture Benefits

- **Type Safety**: Full TypeScript on frontend, Pydantic validation on backend
- **Real-time Updates**: SSE provides instant feedback
- **Extensibility**: Easy to add new agents and tools
- **Production Ready**: Can be deployed to Vercel + any Python hosting service