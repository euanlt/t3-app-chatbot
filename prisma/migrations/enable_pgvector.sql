-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Create a function to search for similar embeddings
CREATE OR REPLACE FUNCTION search_similar_embeddings(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    filter_file_ids text[] DEFAULT NULL
)
RETURNS TABLE(
    id text,
    file_id text,
    chunk_index int,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.file_id,
        de.chunk_index,
        de.content,
        de.metadata,
        1 - (de.embedding <=> query_embedding) as similarity
    FROM document_embeddings de
    WHERE (filter_file_ids IS NULL OR de.file_id = ANY(filter_file_ids))
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;