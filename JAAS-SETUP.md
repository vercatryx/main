# JaaS (Jitsi as a Service) Setup Guide

This guide will help you set up JaaS (Jitsi as a Service) for your Vercatryx meetings feature.

## What is JaaS?

JaaS (Jitsi as a Service) is the official hosted Jitsi service by 8x8. It provides:
- Better reliability than the free public Jitsi instance
- Guaranteed uptime and performance
- Global infrastructure
- Advanced features (recording, transcription, etc.)
- Free tier with 25 monthly active users
- Professional support

## Step 1: Sign Up for JaaS

1. Go to [https://jaas.8x8.vc/](https://jaas.8x8.vc/)
2. Click "Sign Up" or "Get Started"
3. Create your account with your email
4. Verify your email address

## Step 2: Create Your JaaS Application

1. Log into the [JaaS Console](https://jaas.8x8.vc/#/dashboard)
2. Click "Create App" or navigate to your dashboard
3. Give your app a name (e.g., "Vercatryx Meetings")
4. You'll receive your **App ID** - it looks like: `vpaas-magic-cookie-1234567890abcdef`

## Step 3: Generate API Keys

1. In the JaaS Console, navigate to "API Keys" section
2. Click "Generate API Key"
3. Choose "Generate Key Pair" (or upload your own if you prefer)
4. Download or copy the following:
   - **API Key ID** (looks like: `vpaas-magic-cookie-xxx/abc123`)
   - **Private Key** (a PEM-formatted RSA private key)

### If Generating Your Own Key Pair

If you prefer to generate your own RSA key pair:

```bash
# Generate a 4096-bit RSA key pair
ssh-keygen -t rsa -b 4096 -m PEM -f jaas_private_key.pem

# This creates two files:
# jaas_private_key.pem - Your private key (keep this secret!)
# jaas_private_key.pem.pub - Your public key (upload this to JaaS)
```

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# JaaS Configuration
NEXT_PUBLIC_JAAS_APP_ID=vpaas-magic-cookie-your-actual-app-id
JAAS_APP_ID=vpaas-magic-cookie-your-actual-app-id
JAAS_API_KEY_ID=vpaas-magic-cookie-xxx/your-actual-key-id
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_ACTUAL_PRIVATE_KEY_CONTENT_HERE
MULTIPLE_LINES_ARE_OK
-----END PRIVATE KEY-----"
```

### Important Notes:

1. **NEXT_PUBLIC_JAAS_APP_ID**: This is exposed to the browser (needed for room names)
2. **JAAS_APP_ID**: Server-side only (used for JWT signing)
3. **JAAS_API_KEY_ID**: Server-side only (used in JWT header)
4. **JAAS_PRIVATE_KEY**: Server-side only, NEVER expose this! Keep it secret!

### Formatting the Private Key

The private key should be in PEM format. When adding to `.env.local`, you have two options:

**Option 1: Multi-line (recommended for readability)**
```bash
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
(your key content here, multiple lines are fine)
...
-----END PRIVATE KEY-----"
```

**Option 2: Single line with `\n` (if multi-line doesn't work)**
```bash
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
```

## Step 5: Verify Configuration

After setting up your environment variables:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try creating and joining a meeting
3. Check the browser console for any errors
4. The console should show: "Jitsi Meet initialized with JaaS for room: ..."

## Pricing Information

### Free Tier
- 25 monthly active users (MAU) free
- Perfect for small teams and testing
- Full feature access

### Paid Plans
- Starting at $0.33/user/month (with committed users)
- Usage-based pricing: ~$12/month for up to 20 participants
- First 3 months: 80% off with promo code `MJS2JAAS`

### Add-ons
- Recording: $0.01 per minute
- Transcription: Available on premium plans
- Dial-in numbers: Available on premium plans
- RTMP streaming: Available on premium plans

## Features Available

### All Plans
✅ HD video and audio
✅ Screen sharing
✅ Chat
✅ End-to-end encryption
✅ Global infrastructure
✅ Mobile support

### Premium Plans
✅ Recording
✅ Transcription
✅ Dial-in/dial-out
✅ Live streaming (RTMP/RTMPS)
✅ Custom branding
✅ Priority support

## Troubleshooting

### Error: "JaaS credentials not configured"
- Make sure all environment variables are set in `.env.local`
- Restart your dev server after adding variables
- Check that variable names match exactly (case-sensitive)

### Error: "Failed to authenticate"
- Verify your API Key ID is correct
- Check that your Private Key is properly formatted
- Ensure the Private Key matches the Public Key in JaaS console

### Error: "Invalid JWT token"
- Your App ID might be incorrect
- The API Key might not be activated in the JaaS console
- Check the JWT expiration settings

### Meeting loads but shows "Invalid token"
- The Private Key might not match the Public Key
- Check the API Key ID format (should include the App ID prefix)
- Verify the room name format is correct

### Can't join meeting
- Check browser console for specific errors
- Verify camera/microphone permissions
- Try a different browser (Chrome/Firefox recommended)
- Check your network/firewall settings

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Keep your Private Key secret**
   - Never expose in client-side code
   - Never log or display the private key
   - Rotate keys periodically

3. **Use environment variables properly**
   - `NEXT_PUBLIC_*` variables are exposed to browsers
   - Regular variables are server-side only
   - Only put the App ID in `NEXT_PUBLIC_JAAS_APP_ID`

4. **Production deployment**
   - Set environment variables in Vercel/hosting dashboard
   - Never hardcode credentials in code
   - Use separate JaaS apps for dev/staging/prod

## Testing Your Setup

After configuration, you can test by:

1. Creating a test meeting as admin
2. Joining the meeting
3. Checking the browser console logs
4. Verifying video/audio works
5. Testing with multiple participants

## Support

- **JaaS Documentation**: [developer.8x8.com/jaas](https://developer.8x8.com/jaas/docs)
- **JaaS Support**: [8x8 Support Portal](https://support.8x8.com/)
- **Community Forums**: [Jitsi Community](https://community.jitsi.org/)

## Next Steps

After setting up JaaS:

1. ✅ Test with a few users
2. ✅ Monitor your usage in JaaS console
3. ✅ Consider upgrading if you exceed 25 MAU
4. ✅ Enable additional features (recording, etc.) as needed
5. ✅ Set up monitoring and analytics

## Migration from Free Jitsi

The application is now configured to use JaaS instead of the free `meet.jit.si` instance:

**Before**: `meet.jit.si` (free, public, limited)
**After**: `8x8.vc` (JaaS, professional, reliable)

All existing meetings will automatically use JaaS once configured!
