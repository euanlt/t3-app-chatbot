# Testing RAG Functionality

## Prerequisites

1. **Environment Variables** (must be set in Vercel or local .env):
   - `GOOGLE_API_KEY` - Required for embeddings (FREE - 1,500 requests/day)
   - `SUPABASE_URL` - For file storage
   - `SUPABASE_SERVICE_ROLE_KEY` - For file storage
   - `DATABASE_URL` - PostgreSQL with pgvector extension

2. **Database Setup**:
   ```bash
   # Run migrations to create tables
   npx prisma migrate deploy
   ```

## Testing Steps

### 1. Upload a Test Document

1. Go to your app (https://t3-app-chatbot.vercel.app or local)
2. Click the paperclip icon in the chat input
3. Upload a test file:
   - **PDF**: Best for testing (e.g., a product manual, documentation)
   - **Text file**: Simple test with known content
   - **Word doc**: Also supported
   - **Image**: Will use OCR if Google API key is set

### 2. Monitor Upload Status

After uploading, you should see:
- "Processing file..." status
- File should appear in the sidebar under "Uploaded Files"
- Status indicators:
  - 🔄 Processing
  - ✅ Completed
  - ❌ Failed

### 3. Check Processing

The file goes through these stages:
1. **Upload** → Saved to Supabase Storage
2. **Text Extraction** → Content extracted based on file type
3. **Chunking** → Text split into ~1000 character chunks
4. **Embedding** → Each chunk gets a vector embedding (768 dimensions via Gemini)
5. **Storage** → Embeddings saved to database

### 4. Test RAG Queries

Once the file shows as completed (✅), test RAG by asking questions about the content:

**Example queries:**
- "What does the uploaded document say about [topic]?"
- "Summarize the main points from the file"
- "Find information about [specific term] in the document"
- "What are the key features mentioned in the upload?"

### 5. Verify RAG is Working

When RAG is working correctly:
- The AI will reference specific information from your uploaded files
- Responses will include context from the documents
- The system finds relevant chunks based on semantic similarity

## Debugging

### Check Logs

If files fail to process, check:

1. **Vercel Function Logs**:
   ```bash
   vercel logs https://t3-app-chatbot.vercel.app
   ```

2. **Common Issues**:
   - **"429 quota exceeded"** → Very rare with Gemini (1,500/day free limit)
   - **"No storage backend"** → Supabase not configured
   - **"Failed to download"** → Storage access issue
   - **"Google API key not configured"** → Missing GOOGLE_API_KEY

### Database Verification

Check if embeddings were created:

```sql
-- In your database client
SELECT COUNT(*) FROM document_embeddings;

-- Check specific file
SELECT * FROM files WHERE status = 'completed';

-- Check embeddings for a file
SELECT chunk_index, content, embedding IS NOT NULL as has_embedding 
FROM document_embeddings 
WHERE file_id = 'your-file-id';
```

### Quick Test File

Create a simple test.txt file with known content:

```
YNO Test Document

Important Information:
- YNO is an AI-powered chatbot
- It supports RAG functionality
- Users can upload documents
- The system uses Gemini embeddings

Technical Details:
- Embedding model: Gemini text-embedding-004
- Vector dimensions: 768
- Chunk size: 1000 characters
- Overlap: 200 characters
```

Upload this file and then ask:
- "What is YNO according to the document?"
- "What embedding model does the system use?"
- "How many vector dimensions are used?"

If the AI correctly answers these questions using the document content, RAG is working!

## Performance Tips

1. **Smaller files process faster** - Start with files under 1MB
2. **Text/PDF work best** - These have the most reliable text extraction
3. **Free tier is generous** - 1,500 embedding requests per day with Gemini
4. **Check Supabase quotas** - Storage has limits on free tier

## Expected Behavior

When everything is working:
1. File uploads quickly (few seconds)
2. Processing completes within 30-60 seconds
3. Chat responses include relevant document context
4. No errors in the logs