# Cloudflare R2 Setup Guide for File Storage

## Overview
This guide will help you set up Cloudflare R2 to store all chat files (images, documents, voice notes) instead of using local storage or other solutions.

**Benefits of R2:**
- Cheaper than AWS S3 (no egress fees)
- S3-compatible API (easy integration)
- Fast global CDN
- Pay only for storage (~$0.015/GB/month)

---

## Step 1: Create Cloudflare R2 Bucket

### Sign Up / Login to Cloudflare
1. Go to https://dash.cloudflare.com
2. Sign in or create a free account
3. Add a payment method (R2 requires it, but has generous free tier)

### Enable R2
1. In the Cloudflare dashboard, click **R2** in the left sidebar
2. If this is your first time, click **Purchase R2** (don't worry, free tier is generous)
3. Review and accept the terms

### Create a Bucket
1. Click **Create bucket**
2. **Bucket name**: `vercatryx-chat-files` (or any name you prefer)
   - Name must be unique across all R2 buckets
   - Use lowercase letters, numbers, and hyphens only
3. **Location**: Choose **Automatic** (Cloudflare optimizes automatically)
4. Click **Create bucket**

### Configure CORS (Important!)
1. Click on your newly created bucket
2. Go to **Settings** tab
3. Scroll to **CORS Policy**
4. Click **Add CORS policy**
5. Use this configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://vercatryx.com",
      "https://clients.vercatryx.com",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

6. Click **Save**

---

## Step 2: Create API Token

### Generate R2 API Token
1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. **Token name**: `vercatryx-production`
4. **Permissions**:
   - Select **Object Read & Write**
5. **TTL**: Leave as default (or set to never expire)
6. **Bucket**: Select your `vercatryx-chat-files` bucket
7. Click **Create API Token**

### Save Your Credentials
You'll see these values - **COPY THEM NOW** (you won't see them again!):

```
Access Key ID: <your-access-key-id>
Secret Access Key: <your-secret-access-key>
```

**Important**: Keep these secure! Don't commit them to git.

### Get Your Account ID
1. On the R2 overview page, look for **Account ID**
2. It's displayed at the top right of the page
3. Copy this value

### Get Your Bucket Endpoint
Your R2 endpoint will be:
```
https://<account-id>.r2.cloudflarestorage.com
```

Replace `<account-id>` with your actual Account ID.

---

## Step 3: Configure Public Access (Optional but Recommended)

### Option A: Public Bucket (Simpler)
If you want files to be publicly accessible via direct URL:

1. In your bucket settings, click **Settings** tab
2. Scroll to **Public access**
3. Click **Allow Access**
4. Your public URL will be: `https://pub-<hash>.r2.dev`

### Option B: Custom Domain (More Professional)
For URLs like `files.vercatryx.com`:

1. Go to your bucket **Settings** → **Custom Domains**
2. Click **Connect Domain**
3. Enter: `files.vercatryx.com`
4. Cloudflare will provide DNS instructions
5. Add the CNAME record in GoDaddy:
   ```
   Type: CNAME
   Name: files
   Value: <provided-by-cloudflare>
   ```
6. Wait for DNS propagation (5-15 minutes)

---

## Step 4: Add Environment Variables to Your Project

### Create/Update `.env.local`

In your project root, add these variables to `.env.local`:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=vercatryx-chat-files
R2_PUBLIC_URL=https://pub-xxxxxxxxx.r2.dev
# OR if using custom domain:
# R2_PUBLIC_URL=https://files.vercatryx.com
```

**Important**:
- Never commit `.env.local` to git
- `.env.local` is already in `.gitignore`

### Add to Vercel Environment Variables

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
4. Set for: **Production**, **Preview**, and **Development**
5. Click **Save**

---

## Step 5: Test R2 Connection (Do This After Code Setup)

### Test Upload
Once the code is deployed, you can test by:
1. Go to client portal
2. Send a message with a file attachment
3. Check if it uploads successfully
4. Verify file appears in R2 bucket (Cloudflare dashboard)

### Test Download
1. Click on the uploaded file in chat
2. Should download/open correctly
3. Check browser network tab to verify it's coming from R2

---

## Monitoring & Maintenance

### Check Storage Usage
1. Go to R2 dashboard
2. View **Storage** and **Operations** metrics
3. Monitor costs (should be minimal)

### R2 Free Tier (as of 2024)
- **Storage**: 10 GB/month free
- **Class A operations**: 1 million/month (uploads)
- **Class B operations**: 10 million/month (downloads)

Beyond free tier:
- Storage: $0.015/GB/month
- No egress fees (unlike AWS S3!)

### Bucket Management
- Regularly review uploaded files
- Consider implementing file retention policy
- Set up automatic cleanup for old files (optional)

---

## Security Best Practices

### ✅ DO:
- Store credentials in environment variables only
- Use `.env.local` for local development
- Restrict bucket access with API tokens
- Enable CORS only for your domains
- Use HTTPS for all file access
- Implement file type validation in code
- Scan uploaded files for malware (optional)

### ❌ DON'T:
- Commit credentials to git
- Share API tokens
- Allow unlimited file uploads
- Skip file size validation
- Use public tokens in client-side code

---

## Troubleshooting

### Issue: "Access Denied" Error
**Cause**: API token doesn't have correct permissions

**Solution**:
- Verify API token has **Object Read & Write**
- Check token is scoped to correct bucket
- Ensure environment variables are set correctly

### Issue: CORS Error in Browser
**Cause**: CORS policy not configured

**Solution**:
- Add CORS policy to bucket (see Step 1)
- Include your domain in AllowedOrigins
- Clear browser cache and retry

### Issue: Files Not Uploading
**Cause**: Incorrect endpoint or credentials

**Solution**:
- Verify R2_ACCOUNT_ID is correct
- Check endpoint format: `https://<account-id>.r2.cloudflarestorage.com`
- Test credentials using AWS CLI or SDK

### Issue: "Bucket Not Found"
**Cause**: Wrong bucket name or region

**Solution**:
- Double-check R2_BUCKET_NAME matches actual bucket
- Ensure no typos in bucket name
- Check bucket exists in Cloudflare dashboard

---

## Migration from Current Setup

If you currently store files locally or elsewhere:

### Before Migration
1. Set up R2 as described above
2. Test with new uploads first
3. Keep old storage active during testing

### During Migration
1. Update code to use R2 (done in code changes)
2. Test thoroughly with new uploads
3. Optionally migrate old files to R2

### After Migration
1. Monitor for any issues
2. Once stable, can remove old storage
3. Update any hardcoded URLs

---

## Cost Estimation

### For Small to Medium Usage
**Assumptions:**
- 1,000 files uploaded/month
- Average file size: 500 KB
- 100 downloads per file

**Costs:**
- Storage: 500 MB × $0.015/GB = ~$0.01/month
- Class A (uploads): 1,000 ops = FREE (under 1M limit)
- Class B (downloads): 100,000 ops = FREE (under 10M limit)
- **Total: ~$0.01/month** (essentially free!)

### For Heavy Usage
- 10,000 files/month at 1 MB each
- Storage: ~$0.15/month
- Still well within free operation limits

---

## Verification Checklist

- [ ] Cloudflare account created
- [ ] R2 enabled with payment method
- [ ] Bucket created: `vercatryx-chat-files`
- [ ] CORS policy configured
- [ ] API token created with Read & Write permissions
- [ ] Account ID copied
- [ ] Access Key ID copied
- [ ] Secret Access Key copied
- [ ] Public URL or custom domain configured
- [ ] Environment variables added to `.env.local`
- [ ] Environment variables added to Vercel
- [ ] Never committed credentials to git

---

## Next Steps

Once you've completed all the steps above:

1. ✅ I'll update the code to integrate R2
2. ✅ Install necessary dependencies (AWS SDK)
3. ✅ Create upload/download API routes
4. ✅ Update chat functionality to use R2
5. ✅ Test file uploads and downloads
6. ✅ Deploy to production

---

## Useful Links

- **R2 Dashboard**: https://dash.cloudflare.com/r2
- **R2 Documentation**: https://developers.cloudflare.com/r2/
- **R2 Pricing**: https://developers.cloudflare.com/r2/pricing/
- **R2 API Reference**: https://developers.cloudflare.com/r2/api/s3/api/

---

## Support

If you encounter issues:
1. Check the Troubleshooting section
2. Verify all credentials are correct
3. Check Cloudflare R2 status page
4. Review Vercel deployment logs

The setup is straightforward and once configured, R2 will handle all file storage reliably and cost-effectively!
