# Vercel KV Database Setup Guide

This guide explains how to set up Vercel KV (Redis) for the availability checking feature.

## What Changed

The "See if someone is available now" feature has been migrated from using a local JSON file to **Vercel KV**, a serverless Redis database provided by Vercel.

### Benefits of Vercel KV:
- **Real database**: Persistent, reliable storage across deployments
- **Serverless**: Auto-scaling with zero configuration
- **Fast**: Redis-based for sub-millisecond read/write operations
- **TTL support**: Automatic cleanup of old requests (24 hours)
- **Production-ready**: Built for high-traffic applications

## Setup Instructions

### Option 1: Deploy to Vercel (Recommended)

1. **Push your code to GitHub** (if not already done)

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project" and select your repository
   - Deploy the project

3. **Add Vercel KV Storage**:
   - In your Vercel project dashboard, go to the "Storage" tab
   - Click "Create Database"
   - Select "KV" (Redis)
   - Choose a database name (e.g., `vercatryx-availability`)
   - Select your preferred region
   - Click "Create"

4. **Connect to your project**:
   - After creation, click "Connect to Project"
   - Select your project
   - Vercel will automatically add the required environment variables:
     - `KV_URL`
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
     - `KV_REST_API_READ_ONLY_TOKEN`

5. **Redeploy**:
   - Vercel will automatically redeploy with the new environment variables
   - Your availability feature is now using a real database!

### Option 2: Local Development

For local development, you can use the Vercel KV database you created:

1. **Create a KV database** on Vercel (follow steps 1-4 above)

2. **Get your credentials**:
   - In Vercel dashboard, go to Storage → Your KV Database
   - Click on ".env.local" tab
   - Copy all the `KV_*` environment variables

3. **Add to your `.env.local`**:
   ```bash
   # Vercel KV Database (Redis)
   KV_URL=your-kv-url
   KV_REST_API_URL=your-kv-rest-api-url
   KV_REST_API_TOKEN=your-kv-rest-api-token
   KV_REST_API_READ_ONLY_TOKEN=your-kv-rest-api-read-only-token
   ```

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## How It Works

### Database Structure

Each availability request is stored in Vercel KV with:

- **Key**: `availability:{requestId}`
- **Value**: JSON object with:
  ```typescript
  {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone: string;
    message?: string;
    status: 'pending' | 'available' | 'unavailable' | 'timeout';
    createdAt: string;
    respondedAt?: string;
  }
  ```
- **TTL**: 24 hours (automatic cleanup)

### API Flow

1. **User clicks "See if someone is available now"**
   - `POST /api/availability/check` creates a request in KV
   - Email sent to admin with response links

2. **Frontend polls for updates**
   - `GET /api/availability/status/{id}` checks request status
   - Automatically marks as 'timeout' after 3 minutes

3. **Admin responds via email link**
   - `POST /api/availability/respond/{id}` updates status
   - User sees immediate notification

## Troubleshooting

### "Failed to connect to KV" error

**Solution**: Make sure you have the KV environment variables set in `.env.local` or in Vercel's environment variables.

### Local development not working

**Solution**:
1. Check that all `KV_*` variables are in your `.env.local`
2. Restart your development server
3. Make sure you copied the credentials from the Vercel dashboard

### Data not persisting

**Solution**: The old JSON file-based storage has been completely replaced. Make sure:
1. You're using the latest code with KV integration
2. Your environment variables are correctly configured
3. You've redeployed/restarted after adding the variables

## Migration Notes

- **Old data**: The old `data/availability-requests.json` file is no longer used and can be safely deleted
- **No migration needed**: This is a new feature, so there's no old data to migrate
- **Backwards compatible**: The API endpoints remain the same, only the storage backend changed

## Cost

Vercel KV includes:
- **Free tier**: 30,000 commands/month, 256 MB storage
- **Pro tier**: 500,000 commands/month, 1 GB storage
- More than enough for the availability checking feature

## Files Changed

- **Created**: `src/lib/kv.ts` - Database utility functions
- **Updated**: `src/app/api/availability/check/route.ts` - Uses KV instead of JSON file
- **Updated**: `src/app/api/availability/status/[id]/route.ts` - Uses KV for status checks
- **Updated**: `src/app/api/availability/respond/[id]/route.ts` - Uses KV for responses

The frontend (`src/app/contact/page.tsx`) and admin page remain unchanged - they work seamlessly with the new database backend!
