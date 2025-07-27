# AI Chatbot T3 App

A modern AI chatbot application built with the T3 Stack, featuring file uploads, model selection, and MCP plugin support.

## Tech Stack

This is a [T3 Stack](https://create.t3.gg/) project with:
- **Framework**: Next.js 15 with App Router
- **API**: tRPC for type-safe APIs
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Query (via tRPC)

## Features

- 🤖 **Multiple AI Models**: Support for various AI models including free and premium options
- 📁 **File Upload**: Upload and process documents (PDF, DOCX, TXT, Images)
- 🔌 **MCP Plugins**: Extensible plugin system for additional capabilities
- 💬 **Real-time Chat**: Responsive chat interface with markdown support
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 🧠 **Pydantic AI Agents**: Advanced AI agents with AG-UI protocol integration
  - Agentic Chat with tools (time, colors)
  - Human-in-the-Loop workflows
  - Real-time progress tracking
  - Content generation (haikus, recipes, code)
  - Collaborative state management
  - Predictive text editing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for Pydantic AI agents)

### Installation

1. Clone the repository:
```bash
cd ai-chatbot-t3-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `OPENROUTER_API_KEY`: Your OpenRouter API key for AI models
- Other optional API keys for MCP plugins and vision capabilities

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Running Pydantic AI Agents (Optional)

To use the advanced Pydantic AI agents:

1. Set up Python environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
npm run agents:install
```

2. Start the agents backend:
```bash
npm run agents:start
```

3. The agents will be available in the "Agents" tab of the sidebar.

See [docs/PYDANTIC_AI_AGENTS.md](docs/PYDANTIC_AI_AGENTS.md) for detailed documentation.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── _components/       # React components
│   │   ├── chat/         # Chat-related components
│   │   └── sidebar/      # Sidebar components
│   └── page.tsx          # Main page
├── server/                # Server-side code
│   ├── api/              # tRPC API
│   │   ├── routers/      # API routers
│   │   └── trpc.ts       # tRPC configuration
│   └── services/         # Business logic services
└── env.js                # Environment variable validation
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run agents:install` - Install Python dependencies for Pydantic AI agents
- `npm run agents:start` - Start the Pydantic AI agents backend

## API Routes

The application uses tRPC for type-safe API communication:

- **Chat Router** (`/api/trpc/chat`)
  - `sendMessage` - Send a message to the AI
  - `getChatHistory` - Retrieve chat history
  - `clearChatHistory` - Clear chat history

- **Models Router** (`/api/trpc/models`)
  - `getAvailableModels` - Get list of AI models
  - `getModelById` - Get specific model details
  - `getModelCategories` - Get models by category

- **Files Router** (`/api/trpc/files`)
  - `getUploadedFiles` - List uploaded files
  - `processFile` - Process uploaded file
  - `deleteFile` - Delete a file

- **MCP Router** (`/api/trpc/mcp`)
  - `getAvailableServers` - List MCP servers
  - `startServer` - Start an MCP server
  - `stopServer` - Stop an MCP server

## Configuration

### Environment Variables

See `.env.example` for all available environment variables.

### Supported File Types

- Text: `.txt`, `.md`, `.csv`, `.json`
- Documents: `.pdf`, `.docx`, `.pptx`, `.xlsx`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- Code: `.js`, `.ts`, `.py`, `.html`, `.css`

### AI Models

The app supports models from various providers:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Google (Gemini, PaLM)
- Meta (Llama)
- Mistral
- And more via OpenRouter

## Migration Status

This application has been migrated from a separate frontend/backend architecture to the T3 stack. The following features are ready:

✅ Basic chat interface
✅ Model selection
✅ tRPC API setup
✅ Component migration
✅ Environment configuration

🚧 Work in progress:
- File upload processing
- MCP server integration
- AI service implementation

## Deployment

Follow the T3 deployment guides for:
- [Vercel](https://create.t3.gg/en/deployment/vercel)
- [Netlify](https://create.t3.gg/en/deployment/netlify)
- [Docker](https://create.t3.gg/en/deployment/docker)

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org)
- [tRPC Documentation](https://trpc.io)
- [Tailwind CSS](https://tailwindcss.com)
- [T3 Stack Documentation](https://create.t3.gg/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.