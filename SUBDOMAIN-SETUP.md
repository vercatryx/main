# Subdomain Setup Guide: clients.vercatryx.com

## Overview
This guide will help you set up `clients.vercatryx.com` to point to your client portal.

---

## Step 1: GoDaddy DNS Configuration

### Navigate to DNS Settings
1. Log into your **GoDaddy account** at https://godaddy.com
2. Click **My Products** in the top menu
3. Find **Domains** section
4. Click on **vercatryx.com** to manage it
5. Click the **DNS** button (or **Manage DNS**)

### Add CNAME Record
1. Scroll down to the **DNS Records** section
2. Click the **Add** button (or **Add Record**)
3. Fill in the following details:

   ```
   Type:     CNAME
   Name:     clients
   Value:    cname.vercel-dns.com
   TTL:      600 seconds (or leave as default - 1 hour)
   ```

4. Click **Save**

### What This Does
- Creates a subdomain `clients.vercatryx.com`
- Points it to Vercel's DNS system
- Vercel will handle routing to your application

---

## Step 2: Vercel Domain Configuration

### Add Domain to Vercel
1. Go to **Vercel Dashboard** at https://vercel.com
2. Select your **vercatryx** project
3. Click **Settings** in the top navigation
4. Click **Domains** in the left sidebar
5. Click **Add** button
6. Enter: `clients.vercatryx.com`
7. Click **Add**

### Verification
- Vercel will automatically detect your CNAME record
- Status should show as **Valid Configuration** within a few minutes
- If it shows an error, double-check your GoDaddy DNS settings

### SSL Certificate
- Vercel automatically provisions an SSL certificate
- This may take 5-10 minutes after domain verification
- Your subdomain will be accessible via HTTPS once complete

---

## Step 3: Deploy Your Code

### Push Changes to Git
```bash
git push
```

### Vercel Auto-Deploy
- Vercel will automatically detect your push
- Deployment usually takes 1-2 minutes
- You can monitor progress in the Vercel dashboard

---

## Step 4: Wait for DNS Propagation

### Typical Wait Times
- **GoDaddy → Vercel**: 5-15 minutes (usually very fast)
- **Global DNS propagation**: Up to 48 hours (usually under 1 hour)

### Check DNS Propagation Status
Visit: https://dnschecker.org
- Enter: `clients.vercatryx.com`
- Look for CNAME record pointing to `cname.vercel-dns.com`
- Green checkmarks indicate successful propagation in that region

---

## Step 5: Test Your Subdomain

### Once DNS is Propagated
Visit: https://clients.vercatryx.com

### Expected Behavior
- Should show your client portal login/dashboard
- URL stays as `clients.vercatryx.com` (clean, no `/clients` in path)
- SSL certificate should be active (green padlock in browser)

### Backward Compatibility
The original URL still works:
- `https://vercatryx.com/clients` → Client portal
- Both URLs show the same content

---

## Localhost Development

### How Subdomain Works Locally

The subdomain routing **won't work on localhost** because:
1. `localhost` doesn't support subdomains natively
2. No DNS resolution for `clients.localhost`

### Option 1: Use the Regular Path (Recommended)
```bash
npm run dev
```
Then visit: http://localhost:3000/clients

**This is the easiest way** - just use the `/clients` path during development.

### Option 2: Modify Your Hosts File (Advanced)

If you want to test `clients.localhost`:

#### On Mac/Linux:
1. Open terminal and edit hosts file:
   ```bash
   sudo nano /etc/hosts
   ```

2. Add this line:
   ```
   127.0.0.1 clients.localhost
   ```

3. Save and exit (Ctrl+X, then Y, then Enter)

4. Start your dev server:
   ```bash
   npm run dev
   ```

5. Visit: http://clients.localhost:3000

#### On Windows:
1. Open Notepad **as Administrator**
2. File → Open: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line:
   ```
   127.0.0.1 clients.localhost
   ```
4. Save the file
5. Start your dev server and visit: http://clients.localhost:3000

### Option 3: Use a Dev Tool (Alternative)

Install a local DNS tool like:
- **Caddy** - Simple reverse proxy with automatic HTTPS
- **nginx** - More complex but powerful
- **Local Tunnel** services (ngrok, localtunnel)

---

## Troubleshooting

### Issue: "502 Bad Gateway" Error
**Cause**: DNS not propagated yet or Vercel not configured

**Solution**:
- Wait 10-15 more minutes for DNS propagation
- Check Vercel domain status (should show green checkmark)
- Verify CNAME record in GoDaddy

### Issue: "404 Not Found"
**Cause**: Domain added to Vercel but not configured correctly

**Solution**:
- Ensure domain shows as "Valid" in Vercel
- Check that latest code is deployed
- Try redeploying from Vercel dashboard

### Issue: "SSL Certificate Error"
**Cause**: Certificate not issued yet

**Solution**:
- Wait 10-15 minutes for Vercel to provision certificate
- Try clearing browser cache and reloading
- Check Vercel dashboard for SSL status

### Issue: Localhost Subdomain Not Working
**Cause**: Browser doesn't resolve `clients.localhost`

**Solution**:
- Use http://localhost:3000/clients instead
- OR modify hosts file (see Localhost Development section above)

### Issue: Changes Not Showing
**Cause**: DNS cache or browser cache

**Solution**:
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+F5)
- Wait for deployment to complete in Vercel
- Try incognito/private browsing window

---

## Verification Checklist

- [ ] CNAME record added in GoDaddy DNS
- [ ] Domain added in Vercel settings
- [ ] Domain shows "Valid Configuration" in Vercel
- [ ] Code pushed to Git repository
- [ ] Vercel deployment completed successfully
- [ ] DNS propagation complete (check dnschecker.org)
- [ ] Can access https://clients.vercatryx.com
- [ ] SSL certificate active (green padlock)
- [ ] Client portal loads correctly

---

## Summary

### Production URLs
- **Main site**: https://vercatryx.com
- **Client portal**: https://clients.vercatryx.com
- **Legacy URL**: https://vercatryx.com/clients (still works)

### Development URLs
- **Main site**: http://localhost:3000
- **Client portal**: http://localhost:3000/clients
- **With hosts file**: http://clients.localhost:3000

### Time to Complete
- DNS setup: 5 minutes
- Vercel setup: 2 minutes
- DNS propagation: 5-60 minutes (average: 15 minutes)
- Total: Usually live within 30 minutes

---

## Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify each step in the Verification Checklist
3. Check Vercel deployment logs for errors
4. Test DNS propagation at dnschecker.org

The middleware code is configured to automatically handle routing, so once DNS is set up correctly, everything should work seamlessly!
