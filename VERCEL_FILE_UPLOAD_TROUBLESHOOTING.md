# Vercel File Upload Troubleshooting

## Current Issue
File uploads are failing on Vercel with error in `files.getFileProcessingStatus`.

## Most Likely Cause
The Supabase environment variables are not configured in Vercel.

## Solution Steps

### 1. Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `t3-app-chatbot` project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these values in your Supabase project:
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to **Settings** → **API**
- Copy:
  - **Project URL** → `SUPABASE_URL`
  - **Service Role Key** (under "Service role - secret") → `SUPABASE_SERVICE_ROLE_KEY`

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

1. **"No storage backend available"**
   - Supabase environment variables are missing or incorrect
   
2. **"Failed to upload file"**
   - Check that both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Verify the values are correct (no extra spaces or quotes)
   
3. **"Storage bucket not found"**
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