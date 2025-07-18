# File Upload Fix for Vercel

The file upload feature doesn't work on Vercel because serverless functions don't have persistent file storage. Here are the solutions:

## Quick Fix - Disable File Uploads on Vercel

For now, RAG won't work on Vercel without implementing cloud storage. The app will work for chat but not file uploads.

## Permanent Solutions

### Option 1: Vercel Blob Storage (Recommended)
```bash
npm install @vercel/blob
```

Then update the file service to use Vercel Blob instead of local file system.

### Option 2: AWS S3
1. Create an S3 bucket
2. Install AWS SDK: `npm install @aws-sdk/client-s3`
3. Update file service to upload to S3

### Option 3: Cloudinary
1. Create Cloudinary account
2. Install SDK: `npm install cloudinary`
3. Update file service to use Cloudinary

### Option 4: Supabase Storage
Since you're already using Supabase for the database:
1. Enable Storage in Supabase dashboard
2. Create a bucket for uploads
3. Use Supabase client to upload files

## Implementation Example (Supabase Storage)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// In saveFile function:
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`files/${filename}`, buffer)
```

## For Testing Locally

The file upload and RAG features will work perfectly when running locally with `npm run dev` since local development has access to the file system.

## Current Status

- ✅ Chat functionality works on Vercel
- ✅ Database and embeddings work
- ❌ File uploads need cloud storage
- ❌ RAG requires file uploads to work

To fully enable RAG on Vercel, you need to implement one of the cloud storage solutions above.