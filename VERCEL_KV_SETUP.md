# Vercel Blob Storage Setup Guide

This guide explains how to set up Vercel Blob for the availability checking feature.

## What Changed

The "See if someone is available now" feature has been migrated from using a local JSON file to **Vercel Blob**, a serverless object storage service provided by Vercel.

### Benefits of Vercel Blob:
- **Real database**: Persistent, reliable storage across deployments
- **Built-in**: No external service or account needed
- **Serverless**: Auto-scaling with zero configuration
- **Fast**: Edge-optimized for quick read/write operations
- **Automatic cleanup**: Old requests (24+ hours) are removed automatically
- **Production-ready**: Built for high-traffic applications

## Setup Instructions

### Option 1: Deploy to Vercel (Recommended)

1. **Push your code to GitHub** (if not already done)

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project" and select your repository
   - Deploy the project

3. **Add Vercel Blob Storage**:
   - In your Vercel project dashboard, go to the **"Storage"** tab
   - Click **"Create Database"**
   - Select **"Blob"** (Fast object storage)
   - Choose a database name (e.g., `vercatryx-blob`)
   - Click **"Create"**

4. **Connect to your project**:
   - After creation, click **"Connect to Project"**
   - Select your project
   - Vercel will automatically add the required environment variable:
     - `BLOB_READ_WRITE_TOKEN`

5. **Redeploy** (usually automatic):
   - Vercel will automatically redeploy with the new environment variable
   - Your availability feature is now using Vercel Blob storage!

**That's it!** The setup is complete and your feature will work immediately.

### Option 2: Local Development

For local development, you can use the Vercel Blob storage you created:

1. **Create a Blob storage** on Vercel (follow steps 1-4 above)

2. **Get your credentials**:
   - In Vercel dashboard, go to Storage → Your Blob Store
   - Click on the **".env.local"** tab
   - Copy the `BLOB_READ_WRITE_TOKEN` environment variable

3. **Add to your `.env.local`**:
   ```bash
   # Vercel Blob Storage
   BLOB_READ_WRITE_TOKEN=your-blob-token-here
   ```

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## How It Works

### Storage Structure

All availability requests are stored in a single JSON file in Vercel Blob:

- **Filename**: `availability-requests.json`
- **Contents**: Object with request IDs as keys:
  ```typescript
  {
    "request-id-1": {
      id: string;
      name: string;
      email: string;
      company?: string;
      phone: string;
      message?: string;
      status: 'pending' | 'available' | 'unavailable' | 'timeout';
      createdAt: string;
      respondedAt?: string;
    },
    "request-id-2": { ... }
  }
  ```
- **Cleanup**: Requests older than 24 hours are automatically removed when new requests are saved

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

### "Failed to upload to blob" error

**Solution**: Make sure you have the `BLOB_READ_WRITE_TOKEN` environment variable set in `.env.local` or in Vercel's environment variables.

### Local development not working

**Solution**:
1. Check that `BLOB_READ_WRITE_TOKEN` is in your `.env.local`
2. Restart your development server
3. Make sure you copied the token from the Vercel dashboard

### Data not persisting

**Solution**: Make sure:
1. You've created a Blob storage in Vercel
2. The storage is connected to your project
3. The `BLOB_READ_WRITE_TOKEN` environment variable is set
4. You've redeployed/restarted after adding the variable

## Migration Notes

- **Old data**: The old `data/availability-requests.json` file is no longer used and can be safely deleted
- **No migration needed**: This is a new feature, so there's no old data to migrate
- **Backwards compatible**: The API endpoints remain the same, only the storage backend changed

## Cost

Vercel Blob includes:
- **Hobby (Free)**: 1 GB storage, 10 GB bandwidth/month
- **Pro**: 100 GB storage, 1 TB bandwidth/month
- More than enough for the availability checking feature (uses minimal storage)

## Files Changed

- **Created**: `src/lib/kv.ts` - Database utility functions
- **Updated**: `src/app/api/availability/check/route.ts` - Uses KV instead of JSON file
- **Updated**: `src/app/api/availability/status/[id]/route.ts` - Uses KV for status checks
- **Updated**: `src/app/api/availability/respond/[id]/route.ts` - Uses KV for responses

The frontend (`src/app/contact/page.tsx`) and admin page remain unchanged - they work seamlessly with the new database backend!
