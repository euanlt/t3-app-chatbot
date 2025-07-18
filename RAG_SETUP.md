# RAG (Retrieval-Augmented Generation) Setup Guide

This guide will help you set up RAG capabilities for your YNO chatbot.

## What is RAG?

RAG enhances your chatbot by:
- Searching through uploaded documents to find relevant information
- Providing accurate, context-aware responses based on your data
- Reducing AI hallucinations by grounding responses in real documents
- Enabling semantic search across all your files

## Prerequisites

1. **OpenAI API Key** - Required for generating embeddings
   - Add to your environment variables: `OPENAI_API_KEY=your-key-here`
   - Get one from: https://platform.openai.com/api-keys

2. **Supabase Database** - Must have pgvector extension enabled

## Setup Steps

### 1. Enable pgvector in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to enable pgvector:

```sql
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create the Vector Tables

Run the migration SQL in your Supabase SQL editor:

```sql
-- Run the contents of prisma/migrations/enable_pgvector.sql
```

Or copy and paste this:

```sql
-- Create the document embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to files table
    CONSTRAINT fk_file
        FOREIGN KEY(file_id) 
        REFERENCES "File"(id)
        ON DELETE CASCADE
);

-- Create an index for faster similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on file_id for faster lookups
CREATE INDEX IF NOT EXISTS document_embeddings_file_id_idx 
ON document_embeddings(file_id);
```

### 3. Update Database Schema

Push the Prisma schema changes:

```bash
npm run db:push
```

### 4. Add Environment Variables

Update your `.env` file (and Vercel environment variables):

```env
# Required for RAG
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Customize embedding model
EMBEDDING_MODEL=text-embedding-3-small
```

### 5. Deploy to Vercel

```bash
git add .
git commit -m "Add RAG capabilities"
git push
```

## How RAG Works in Your Chatbot

### Automatic Processing

1. **File Upload**: When users upload documents (PDF, DOCX, TXT, images)
2. **Text Extraction**: Content is extracted from files
3. **Chunking**: Documents are split into smaller, overlapping chunks
4. **Embedding Generation**: Each chunk is converted to a vector embedding
5. **Storage**: Embeddings are stored in the vector database

### Query Time

1. **User asks a question**
2. **Question is converted to an embedding**
3. **Similar chunks are found using vector similarity search**
4. **Relevant chunks are added to the AI's context**
5. **AI generates a response based on the retrieved information**

## Testing RAG

1. **Upload a document** with specific information
2. **Ask questions** about the content
3. The chatbot should provide accurate answers based on your documents

## Monitoring and Debugging

Check the logs for RAG-related activities:
- "Processing embeddings for RAG"
- "RAG context retrieved"
- "RAG search completed"

## Cost Considerations

- **OpenAI Embeddings**: ~$0.00002 per 1K tokens
- **Storage**: Minimal (vectors are compact)
- **Compute**: Vector similarity search is efficient

## Troubleshooting

### "OpenAI API key not configured"
- Ensure `OPENAI_API_KEY` is set in your environment variables
- Restart your development server after adding the key

### "The table document_embeddings does not exist"
- Run the SQL migration in Supabase SQL editor
- Run `npm run db:push` to sync schema

### Files not being processed for RAG
- Check file processing status in the database
- Ensure OpenAI API key is valid
- Check logs for embedding generation errors

## Advanced Configuration

### Adjust Chunk Size

In `src/server/services/documentChunker.ts`:
```typescript
// Default: 1000 chars with 200 char overlap
const documentChunker = new DocumentChunker(1000, 200);
```

### Change Number of Retrieved Chunks

In `src/server/api/routers/chat.ts`:
```typescript
// Default: 5 chunks
const ragContext = await ragService.getContext(
  input.message,
  conversationId,
  5 // Adjust this number
);
```

### Use Different Embedding Models

In `src/server/services/embeddingService.ts`:
```typescript
// Options: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
model: "text-embedding-3-small"
```