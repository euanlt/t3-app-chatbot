-- Check if files are being processed
SELECT id, original_name, status, created_at 
FROM "File" 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if embeddings are being created
SELECT 
    de.file_id,
    f.original_name,
    COUNT(de.id) as chunk_count,
    MIN(LENGTH(de.content)) as min_chunk_size,
    MAX(LENGTH(de.content)) as max_chunk_size
FROM document_embeddings de
JOIN "File" f ON f.id = de.file_id
GROUP BY de.file_id, f.original_name;

-- Check a sample embedding
SELECT 
    file_id,
    chunk_index,
    LEFT(content, 100) as content_preview,
    metadata,
    CASE 
        WHEN embedding_vector IS NOT NULL THEN 'Has vector'
        WHEN embedding IS NOT NULL THEN 'Has JSON embedding'
        ELSE 'No embedding'
    END as embedding_status
FROM document_embeddings
LIMIT 5;