# Vercel File Upload Troubleshooting

## Current Issue
File uploads are failing on Vercel with error in `files.getFileProcessingStatus`.

### Specific Error Found
From the logs:
- **Error 429**: "You exceeded your current quota, please check your plan and billing details"
- This happens when trying to generate embeddings using OpenAI API

## Root Causes

1. **OpenAI API quota exceeded** - The app needs OpenAI API for RAG embeddings
2. **Missing environment variables** - Supabase and OpenAI credentials not configured

## Solution Steps

### 1. Add ALL Required Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `t3-app-chatbot` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
# For file storage
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For RAG embeddings (REQUIRED!)
OPENAI_API_KEY=sk-...your-openai-key

# Your database connection
DATABASE_URL=postgresql://...your-database-url
```

#### Getting the values:

**Supabase credentials:**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to **Settings** → **API**
- Copy:
  - **Project URL** → `SUPABASE_URL`
  - **Service Role Key** (under "Service role - secret") → `SUPABASE_SERVICE_ROLE_KEY`

**OpenAI API Key:**
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Create a new API key or use existing one
- **IMPORTANT**: Check your [usage limits](https://platform.openai.com/account/limits)
- Make sure you have available quota

### 2. Redeploy

After adding the environment variables:
1. Vercel will automatically trigger a new deployment
2. Or manually redeploy from the Vercel dashboard

### 3. Test File Upload

1. Go to https://t3-app-chatbot.vercel.app
2. Try uploading a small text file or PDF
3. Check if the upload succeeds

## Debugging Steps

If it still fails after adding environment variables:

### Check Logs
```bash
# Get the latest deployment URL
vercel ls

# View runtime logs
vercel logs <deployment-url>
```

### Common Issues

1. **"429 You exceeded your current quota"**
   - Your OpenAI account has hit its usage limit
   - Check your [OpenAI usage](https://platform.openai.com/usage)
   - Add billing/credits to your OpenAI account
   - Or use a different API key with available quota

2. **"No storage backend available"**
   - Supabase environment variables are missing or incorrect
   
3. **"Failed to upload file"**
   - Check that both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Verify the values are correct (no extra spaces or quotes)
   
4. **"Storage bucket not found"**
   - The bucket will be created automatically on first upload
   - If it fails, check Supabase Storage permissions

### Verify Environment Variables

You can check if the variables are set in your deployment:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Ensure both variables are listed for Production environment

## Alternative: Local Testing

To test if the code works locally with Supabase:
1. Add the Supabase variables to your local `.env` file
2. Run `npm run dev`
3. Test file uploads locally

This will help determine if it's a code issue or environment configuration issue.