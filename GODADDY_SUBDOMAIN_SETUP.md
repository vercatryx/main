# GoDaddy DNS Configuration for clients.vercatryx.com Subdomain

This guide will help you configure the `clients.vercatryx.com` subdomain in GoDaddy to point to your hosting provider.

## Prerequisites

- Access to your GoDaddy account
- Your hosting provider's IP address or CNAME target (if using Vercel, Netlify, or similar)
- Knowledge of where your main domain (vercatryx.com) is currently hosted

## Step-by-Step Instructions

### Option 1: If Using Vercel (Recommended)

1. **Log in to GoDaddy**
   - Go to [godaddy.com](https://www.godaddy.com) and sign in
   - Navigate to **My Products** → **DNS** → Select your domain (`vercatryx.com`)

2. **Add CNAME Record**
   - Click **Add** or **Add Record**
   - Select **CNAME** as the record type
   - Enter the following:
     - **Name/Host**: `clients`
     - **Value/Points to**: `cname.vercel-dns.com` (or your Vercel CNAME target)
     - **TTL**: `600` (or leave default)
   - Click **Save**

3. **Configure in Vercel**
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Domains**
   - Add `clients.vercatryx.com` as a domain
   - Vercel will automatically configure SSL certificates

### Option 2: If Using Other Hosting Providers

1. **Log in to GoDaddy**
   - Go to [godaddy.com](https://www.godaddy.com) and sign in
   - Navigate to **My Products** → **DNS** → Select your domain (`vercatryx.com`)

2. **Add A Record (if you have a static IP)**
   - Click **Add** or **Add Record**
   - Select **A** as the record type
   - Enter the following:
     - **Name/Host**: `clients`
     - **Value/Points to**: `YOUR_HOSTING_IP_ADDRESS`
     - **TTL**: `600` (or leave default)
   - Click **Save**

3. **OR Add CNAME Record (if your hosting provider supports it)**
   - Click **Add** or **Add Record**
   - Select **CNAME** as the record type
   - Enter the following:
     - **Name/Host**: `clients`
     - **Value/Points to**: `YOUR_HOSTING_PROVIDER_CNAME_TARGET`
       - Examples:
         - Vercel: `cname.vercel-dns.com`
         - Netlify: `YOUR-SITE.netlify.app`
         - AWS: `YOUR-DISTRIBUTION.cloudfront.net`
     - **TTL**: `600` (or leave default)
   - Click **Save**

### Option 3: If Using Cloudflare or Another DNS Provider

If your DNS is managed elsewhere (like Cloudflare), you'll need to add the record there instead:

1. Log in to your DNS provider
2. Add a CNAME record:
   - **Name**: `clients`
   - **Target**: Your hosting provider's CNAME target
   - **TTL**: Auto or 600

## Verification Steps

After adding the DNS record:

1. **Wait for DNS Propagation**
   - DNS changes can take 5 minutes to 48 hours to propagate
   - Typically takes 15-30 minutes for most changes

2. **Check DNS Propagation**
   - Use online tools like:
     - [whatsmydns.net](https://www.whatsmydns.net)
     - [dnschecker.org](https://dnschecker.org)
   - Search for `clients.vercatryx.com` and verify it resolves correctly

3. **Test the Subdomain**
   - Once DNS has propagated, visit `https://clients.vercatryx.com`
   - It should show the same content as `https://www.vercatryx.com/clients`
   - The URL should remain as `clients.vercatryx.com` (not redirect)

## Troubleshooting

### Subdomain Not Working After 24 Hours

1. **Verify DNS Record**
   - Double-check the record was added correctly in GoDaddy
   - Ensure there are no typos in the hostname or target

2. **Check for Conflicting Records**
   - Make sure there's no conflicting A record or CNAME
   - Only one record type (A or CNAME) should exist for `clients`

3. **Verify Hosting Configuration**
   - Ensure your hosting provider is configured to accept requests for `clients.vercatryx.com`
   - Check that SSL certificates are properly configured

4. **Clear DNS Cache**
   - On your local machine, flush DNS cache:
     - **Windows**: `ipconfig /flushdns`
     - **Mac/Linux**: `sudo dscacheutil -flushcache` or `sudo systemd-resolve --flush-caches`

### Common Issues

- **"Site can't be reached"**: DNS hasn't propagated yet, or the record is incorrect
- **SSL Certificate Error**: Your hosting provider needs to issue an SSL certificate for the subdomain (usually automatic)
- **Redirects to main domain**: Check your hosting provider's redirect settings

## Important Notes

- The Next.js application is already configured to handle the `clients.` subdomain via middleware
- No code changes are needed - the middleware automatically rewrites requests from `clients.vercatryx.com` to serve the `/clients` route
- The subdomain will work seamlessly with your existing authentication and routing

## Support

If you continue to have issues:
1. Contact your hosting provider's support
2. Verify your hosting provider supports subdomain configuration
3. Check GoDaddy's DNS documentation for your specific setup

