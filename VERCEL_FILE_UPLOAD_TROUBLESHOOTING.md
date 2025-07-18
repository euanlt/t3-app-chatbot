# Vercel File Upload Troubleshooting

## Current Issue
File uploads are failing on Vercel with error in `files.getFileProcessingStatus`.

### Update: Now Using FREE Gemini Embeddings!
The app now uses Google Gemini for embeddings instead of OpenAI:
- **FREE tier**: 1,500 requests per day
- **No billing required**
- **Good quality embeddings**

## Root Causes (if file upload still fails)

1. **Missing GOOGLE_API_KEY** - Required for RAG embeddings
2. **Missing Supabase credentials** - Required for file storage

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

# For RAG embeddings (REQUIRED! But FREE!)
GOOGLE_API_KEY=AIza...your-google-key

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

**Google API Key:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable "Generative Language API"
- Create an API key
- **FREE**: 1,500 requests per day!

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

1. **"429 quota exceeded"** (Very rare with Gemini)
   - You've hit the 1,500/day free limit
   - Wait until tomorrow (resets daily)
   - Or create another Google Cloud project for more quota

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