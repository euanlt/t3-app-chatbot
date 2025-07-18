# Vercel Deployment Guide

## Database Setup

This application uses SQLite for local development but requires a PostgreSQL database for Vercel deployment.

### Option 1: Vercel Postgres (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" and select "Postgres"
4. Follow the setup wizard
5. Vercel will automatically add the `DATABASE_URL` environment variable

### Option 2: Supabase (Free tier available)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use the "Connection pooling" URL for better performance)
5. Add it as `DATABASE_URL` in your Vercel environment variables

### Option 3: Other Providers

You can use any PostgreSQL provider:
- Neon
- PlanetScale (MySQL - requires schema changes)
- Railway
- Render

## Environment Variables

Add these environment variables in your Vercel project settings:

```bash
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
OPENROUTER_API_KEY=your_openrouter_api_key
LOG_LEVEL=INFO
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Optional API keys for enhanced features
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Steps

1. **Set up your database** (see options above)

2. **Add environment variables** in Vercel:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add all required variables

3. **Update Prisma schema** (if needed):
   - The production schema is already configured for PostgreSQL
   - If you're using a different database, update `prisma/schema.prisma`

4. **Deploy**:
   ```bash
   git push origin main
   ```

Vercel will automatically:
- Install dependencies
- Generate Prisma client
- Run database migrations
- Build and deploy your application

## Initial Database Setup

After connecting your database, you need to create the tables:

### Option 1: Using Vercel's Terminal (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to the "Functions" tab
3. Click on any function and then "View Function Logs"
4. Open the terminal/console
5. Run: `npx prisma db push`

### Option 2: From Your Local Machine

1. Copy your `DATABASE_URL` from Vercel's environment variables
2. Run locally:
   ```bash
   DATABASE_URL="your-database-url-here" npm run db:push
   ```

### Option 3: Using Prisma Studio (Visual Interface)

1. Run locally:
   ```bash
   DATABASE_URL="your-database-url-here" npx prisma studio
   ```
2. This opens a web interface to view and manage your database

## Troubleshooting

### "The table public.Conversation does not exist"

This means the database tables haven't been created yet. Run `npm run db:push` with your production DATABASE_URL to create them.

### Database Connection Issues

If you see "Invalid prisma.conversation.create() invocation":
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check that the database URL is correctly formatted
- Verify the database is accessible from Vercel's servers
- Make sure you've run `prisma db push` to create the tables

### File Uploads

Note: File uploads may not persist on Vercel due to its serverless nature. Consider using:
- Vercel Blob Storage
- AWS S3
- Cloudinary
- Other cloud storage solutions

### Build Errors

If the build fails:
1. Check the build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Verify that `prisma generate` runs during build (it's in package.json)