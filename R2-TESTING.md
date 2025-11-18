# Testing Cloudflare R2 Integration

## Before Testing

### 1. Complete R2 Setup
Follow the steps in `CLOUDFLARE-R2-SETUP.md`:
- ✅ Create R2 bucket
- ✅ Generate API tokens
- ✅ Configure CORS
- ✅ Set up public access or custom domain

### 2. Add Environment Variables

Create `.env.local` (copy from `.env.local.example`):
```bash
cp .env.local.example .env.local
```

Then add your R2 credentials:
```bash
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=vercatryx-chat-files
R2_PUBLIC_URL=https://pub-xxxxxxxxx.r2.dev
```

### 3. Install Dependencies
```bash
npm install
```

---

## Local Testing

### Start Development Server
```bash
npm run dev
```

### Test File Upload

1. Go to: http://localhost:3000/clients
2. Sign in
3. Select a project
4. Open chat
5. Try uploading different file types:
   - **Image**: Upload a .jpg, .png, or .gif
   - **Document**: Upload a .pdf or .docx
   - **Voice Note**: Record and send a voice note

### What to Check

#### ✅ Upload Success Indicators:
- File appears in chat immediately
- Loading spinner shows during upload
- File preview displays correctly
- No errors in browser console

#### ✅ In R2 Dashboard:
1. Go to https://dash.cloudflare.com/r2
2. Click on your bucket
3. Navigate to `chat-files/` folder
4. You should see uploaded files organized by:
   ```
   chat-files/
     ├── {projectId}/
     │   └── {messageId}/
     │       └── {timestamp}-{filename}
   ```

#### ✅ Download/View:
- Click on uploaded files in chat
- Images should display inline
- Documents should download
- Voice notes should play

---

## Production Testing

### After Deployment to Vercel

1. Add environment variables to Vercel:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all R2 variables
   - Deploy

2. Test on production:
   - Visit: https://clients.vercatryx.com
   - Upload files
   - Verify in R2 dashboard
   - Test downloads

---

## Common Issues & Solutions

### Issue: "R2_ACCOUNT_ID is not set" Warning
**Solution**: Add R2_ACCOUNT_ID to `.env.local`

### Issue: Upload Fails Silently
**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. Verify R2 credentials are correct
4. Check CORS policy allows your domain

### Issue: Files Upload But Don't Display
**Check**:
1. R2_PUBLIC_URL is correct
2. Bucket has public access enabled
3. CORS allows GET requests
4. File URL in chat matches public URL format

### Issue: "Access Denied" Error
**Solution**:
1. Verify API token has Read & Write permissions
2. Check token is scoped to correct bucket
3. Regenerate token if needed

---

## File Size Limits

Current limits (can be adjusted):
- Images: 10 MB
- Documents: 25 MB
- Voice notes: 5 MB

To change limits, update validation in upload API.

---

## Monitoring Uploads

### Check Upload Logs

**Local Development**:
```bash
# Terminal running npm run dev
# Look for:
✅ File uploaded to R2: chat-files/...
```

**Production (Vercel)**:
1. Go to Vercel Dashboard
2. Click on deployment
3. View Function Logs
4. Look for R2 upload logs

### Check R2 Metrics

1. Go to R2 Dashboard
2. Click on bucket
3. View **Metrics** tab
4. Monitor:
   - Storage usage
   - Request count
   - Error rate

---

## Testing Checklist

Before going live:

- [ ] R2 bucket created and configured
- [ ] Environment variables set (local and Vercel)
- [ ] Image upload works
- [ ] Document upload works
- [ ] Voice note upload works
- [ ] Files display correctly in chat
- [ ] Files can be downloaded
- [ ] Old attachments still work (if migrating)
- [ ] File deletion works
- [ ] CORS configured correctly
- [ ] No console errors
- [ ] R2 dashboard shows uploaded files

---

## Migration Notes

### If You Have Existing Local Files

The old local files won't break - they'll just stay in `/public/chat-files/`.

New uploads will go to R2 automatically.

**Optional Migration**:
If you want to migrate old files to R2:
1. List files in `/public/chat-files/`
2. For each file, upload to R2
3. Update database URLs
4. Delete local copies

This is optional - old files will continue to work.

---

## Cost Monitoring

### Expected Costs for Light Usage
- 100 files/month @ 500 KB each
- Storage: ~$0.01/month
- Operations: FREE (within limits)

### Set Up Billing Alerts
1. Go to Cloudflare Dashboard
2. Account → Billing
3. Set up email alerts for unexpected charges

---

## Rollback Plan

If R2 isn't working and you need to rollback:

1. Comment out R2 imports in `src/lib/chat.ts`
2. Restore old local file upload code
3. Redeploy

The old code is preserved in git history.

---

## Next Steps After Testing

Once everything works:

1. ✅ Monitor for 24-48 hours
2. ✅ Check R2 costs/usage
3. ✅ Optional: Set up custom domain (files.vercatryx.com)
4. ✅ Optional: Implement file cleanup/retention policy
5. ✅ Optional: Add virus scanning for uploads

---

## Support

If you encounter issues:
1. Check this testing guide
2. Review `CLOUDFLARE-R2-SETUP.md`
3. Check Cloudflare R2 status page
4. Review Vercel deployment logs
5. Check browser console for errors

R2 is very reliable - most issues are configuration-related!
