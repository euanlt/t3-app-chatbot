# How to Verify RAG is Working vs Simple File Reading

## The Difference

### Simple File Reading (Before RAG)
- Includes **entire file content** in the chat context
- Limited by context window size (~4-8k tokens)
- Works for small files only
- No semantic search - just dumps all text

### RAG (Retrieval-Augmented Generation)
- Searches for **relevant chunks** based on your question
- Can handle large documents (100s of pages)
- Uses semantic similarity to find related content
- Only includes relevant portions in context

## How to Test if RAG is Actually Working

### 1. Check Database for Embeddings

```bash
# Connect to your database and run:
SELECT COUNT(*) FROM document_embeddings;
```

If RAG is working, you should see records here after uploading files.

### 2. Upload a Large Document Test

1. Create a test document with **distinct sections** (save as `rag-test.txt`):

```
SECTION 1: PRODUCT FEATURES
The YNO chatbot includes advanced natural language processing capabilities. It can understand context across multiple turns of conversation and maintain coherent dialogue threads.

[Add 20-30 more lines of filler text here about random features]

SECTION 2: TECHNICAL SPECIFICATIONS
The system uses OpenAI's GPT models for language understanding. The embedding model is text-embedding-3-small with 1536 dimensions. Database queries use pgvector for similarity search.

[Add 20-30 more lines of filler text here about random technical details]

SECTION 3: USER GUIDE
To start using YNO, simply type your message in the chat box. You can upload documents using the paperclip icon. The system supports PDF, DOCX, and text files.

[Add 20-30 more lines of filler text here about usage instructions]

SECTION 4: TROUBLESHOOTING
If uploads fail, check your internet connection. Error 429 means API quota exceeded. Contact support at support@yno.ai for assistance.

[Add 20-30 more lines of filler text here about various issues]
```

2. Upload this file
3. Ask **specific questions** that would require finding the right section:
   - "What embedding model dimensions are used?" (Should find Section 2)
   - "How do I contact support?" (Should find Section 4)
   - "How do I upload documents?" (Should find Section 3)

### 3. Look for RAG Indicators in Logs

When RAG is working, you'll see logs like:
```
INFO [RagService] Searching for relevant documents
INFO [RagService] Found 3 relevant chunks
INFO [EmbeddingService] Generating embedding for query
```

### 4. Test Semantic Search

Upload a document and ask questions using **different words** than in the document:

Document contains: "The system uses artificial intelligence"
Ask: "Does it use machine learning?" 

RAG should find this because "artificial intelligence" and "machine learning" are semantically similar.

### 5. Check the Character Limit Test

**Without RAG**: Large files (>10KB) would fail or get truncated
**With RAG**: Can handle files of any size, returns only relevant chunks

### 6. Monitor API Calls

Check your OpenAI usage dashboard:
- File upload should create multiple embedding API calls (one per chunk)
- Each question should create 1 embedding API call for the query

## Quick Verification Commands

### Local Development
```bash
# Check if embeddings are being created
npm run db:studio
# Look at document_embeddings table
```

### Production (Vercel)
```sql
-- Connect to your Supabase database
-- Check embeddings
SELECT 
  f.original_name,
  COUNT(de.id) as chunk_count,
  COUNT(CASE WHEN de.embedding IS NOT NULL THEN 1 END) as embeddings_count
FROM files f
LEFT JOIN document_embeddings de ON f.id = de.file_id
GROUP BY f.id, f.original_name;
```

## The Smoking Gun Test

1. **Disable RAG temporarily** by setting a wrong OpenAI API key
2. Upload a file - it should still upload but show in chat as plain text
3. **Re-enable RAG** with correct API key
4. Upload the same file - now questions should return specific relevant chunks

## What Success Looks Like

When RAG is working properly:
- ✅ `document_embeddings` table has records
- ✅ Only relevant portions appear in responses (not entire file)
- ✅ Can find information using synonyms/related terms
- ✅ Large files work without hitting token limits
- ✅ OpenAI API usage shows embedding calls
- ✅ Responses are contextually relevant to the question

## Common False Positives

These do NOT prove RAG is working:
- ❌ File uploads succeed (this works without RAG)
- ❌ AI can see file content (simple reading does this)
- ❌ Files appear in sidebar (UI feature, not RAG)

The key difference: RAG finds **relevant chunks** rather than dumping the entire file content.