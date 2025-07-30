# Pydantic AI Agent Setup Guide

This guide explains how to set up and test the Pydantic AI agents integration with AG-UI protocol.

## Architecture Overview

The agent system consists of:
1. **Python Backend** - Pydantic AI agents served via FastAPI with AG-UI protocol
2. **CopilotKit Integration** - React components that connect to the Python backend
3. **AG-UI Protocol** - Server-Sent Events (SSE) for real-time agent communication

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ with pip
- PostgreSQL (via Supabase)

### Installing Python

If you get `pip: not found` error, install Python first:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

**macOS:**
```bash
brew install python3
```

**Windows:**
Download from [python.org](https://www.python.org/downloads/) and ensure "Add Python to PATH" is checked during installation.

**Verify Installation:**
```bash
python3 --version
pip3 --version
```

## Setup Instructions

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Set Up Python Backend

Install Python dependencies:
```bash
npm run agents:install
# or manually:
cd src/server/services/pydantic-ai-agent
pip install -r requirements.txt
```

### 3. Configure Environment Variables

For local development, ensure your `.env` file includes:
```env
# Required for database
DATABASE_URL="your-postgres-url"
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# For local Python agents (leave empty for production)
NEXT_PUBLIC_AGENT_BACKEND_URL="http://localhost:9000"
```

### 4. Start Services

**Option 1 - Single Command (Recommended):**
```bash
npm run dev:with-agents
```
This starts both the Next.js dev server and Python backend concurrently.

**Option 2 - Separate Terminals:**

Terminal 1 - Python Backend:
```bash
npm run agents:dev
```

Terminal 2 - Next.js Dev Server:
```bash
npm run dev
```

**Option 3 - Without Python Backend:**
```bash
# Remove NEXT_PUBLIC_AGENT_BACKEND_URL from .env
npm run dev
```
The app will use Next.js API routes to proxy to Python in development.

## Available Agents

1. **Agentic Chat** (`agentic_chat`)
   - Can check time in any timezone
   - Can change background colors
   - Example: "What time is it in Tokyo?" or "Change background to blue"

2. **Human in the Loop** (`human_in_the_loop`)
   - Interactive task planning with approval workflows
   - Breaks down complex tasks into steps

3. **Agentic Generative UI** (`agentic_generative_ui`)
   - Long-running tasks with progress visualization
   - Example: "Deploy my app" or "Analyze this data"

4. **Tool-based Generative UI** (`tool_based_generative_ui`)
   - Creates content like haikus, recipes, code snippets
   - Example: "Write a haiku about coding"

5. **Shared State** (`shared_state`)
   - Collaborative recipe builder
   - Real-time state synchronization

6. **Predictive State Updates** (`predictive_state_updates`)
   - Document editing with predictive text
   - Real-time diff visualization

## Testing the Integration

1. Navigate to http://localhost:3000
2. Click on the "Agents" tab in the sidebar
3. Select any agent to start chatting
4. Test agent-specific features:
   - For Agentic Chat: Try "What time is it in Paris?" or "Change background to linear-gradient(to right, #667eea, #764ba2)"
   - For Tool-based Generative UI: Try "Write a haiku about TypeScript"

## Troubleshooting

### Python Backend Not Starting
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version: `python --version` (should be 3.8+)
- Verify port 9000 is not in use: `lsof -i :9000`

### Agent Not Responding
- Check Python backend logs for errors
- Verify the backend is running on http://localhost:9000
- Check browser console for JavaScript errors
- Ensure CopilotKit packages are installed: `npm list @copilotkit/react-core`

### Background Color Not Changing
- The action is handled client-side in `BackgroundColorHandler`
- Check browser console for action execution
- Try simple colors first (e.g., "red", "blue") before gradients

### Timezone Queries Not Working
- Ensure the Python backend has pytz installed
- Check backend logs for timezone parsing errors
- Use standard timezone names (e.g., "America/New_York", "Asia/Tokyo")

## Deployment Configuration

### Vercel Deployment

The application is configured to deploy Python agents as Vercel serverless functions:

1. **Automatic**: Just push to your repository. Vercel will:
   - Install Python dependencies from `requirements.txt`
   - Deploy Python functions using `@vercel/python` runtime
   - Route `/api/agents/*` to Python handlers

2. **Environment Variables**: In Vercel dashboard, ensure:
   - `NEXT_PUBLIC_AGENT_BACKEND_URL` is NOT set (leave empty)
   - All other required env vars are configured

3. **No Additional Setup**: The `vercel.json` handles all routing and configuration

### Local vs Production

The system automatically detects the environment:
- **Local**: Uses `NEXT_PUBLIC_AGENT_BACKEND_URL` if set
- **Production**: Uses Vercel rewrites to route to Python functions

## Development Tips

1. **Hot Reload**: Both Next.js and FastAPI support hot reload during development
2. **Logging**: Enable debug logging in Python backend by setting `DEBUG=true`
3. **Testing Individual Agents**: Each agent has its own endpoint (e.g., http://localhost:9000/agentic_chat)
4. **AG-UI Protocol**: Use browser DevTools to inspect SSE communication
5. **Quick Start**: Run `npm run dev:with-agents` for the complete local setup