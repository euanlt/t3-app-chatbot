# Supabase Storage Setup for File Uploads

This guide will help you set up Supabase Storage to enable file uploads on Vercel.

## Prerequisites

You already have a Supabase project since you're using it for the database.

## Setup Steps

### 1. Enable Storage in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. If Storage is not enabled, click "Enable Storage"

### 2. Create Storage Bucket

The app will automatically create a bucket called `chatbot-uploads` when the first file is uploaded. Alternatively, you can create it manually:

1. In Storage, click "New bucket"
2. Name: `chatbot-uploads`
3. Public bucket: **No** (keep files private)
4. File size limit: 10MB
5. Allowed MIME types: Leave empty to allow all types

### 3. Get Your Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **Service Role Key**: This is your `SUPABASE_SERVICE_ROLE_KEY` (under "Service role - secret")

⚠️ **Important**: The Service Role Key has full access to your database. Keep it secret and never expose it in client-side code.

### 4. Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Redeploy

After adding the environment variables, redeploy your application. Vercel will automatically trigger a new deployment.

## How It Works

1. **Local Development**: Files are saved to the local `./uploads` directory
2. **Production (Vercel)**: Files are uploaded to Supabase Storage
3. **File Processing**: 
   - For Supabase files, they're temporarily downloaded to `/tmp` for text extraction
   - The extracted text is stored in the database
   - Original files remain in Supabase Storage

## Storage Structure

Files are organized in Supabase Storage as:
```
chatbot-uploads/
└── uploads/
    ├── anonymous/     # Files from non-authenticated users
    │   └── file1.pdf
    └── user-id/       # Files from authenticated users
        └── file2.docx
```

## Troubleshooting

### "Failed to upload file"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Verify the Storage bucket exists
- Check file size (max 10MB)

### "No storage backend available"
- Ensure Supabase environment variables are set in Vercel
- Redeploy after adding environment variables

### Storage Bucket Policies

If you need to set up Row Level Security (RLS) policies:

```sql
-- Allow service role full access (default)
CREATE POLICY "Service role can do anything" ON storage.objects
FOR ALL USING (auth.role() = 'service_role');

-- Optional: Allow authenticated users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[2]);
```

## Testing

1. Deploy to Vercel with the new environment variables
2. Upload a test file through the chat interface
3. Check Supabase Storage dashboard to confirm the file was uploaded
4. Send a message to verify text extraction worked

Your file uploads and RAG functionality should now work on Vercel! 🎉