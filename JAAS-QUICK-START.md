# JaaS Quick Start Guide

## Get Your Credentials in 3 Steps

### 1. Sign Up
Go to [https://jaas.8x8.vc/](https://jaas.8x8.vc/) and create an account

### 2. Get Your Credentials
In the JaaS Console:
- **App ID**: Copy from dashboard (e.g., `vpaas-magic-cookie-abc123def456`)
- **API Keys**: Generate → Download Private Key

### 3. Add to .env.local
```bash
NEXT_PUBLIC_JAAS_APP_ID=vpaas-magic-cookie-YOUR-APP-ID
JAAS_APP_ID=vpaas-magic-cookie-YOUR-APP-ID
JAAS_API_KEY_ID=vpaas-magic-cookie-YOUR-APP-ID/YOUR-KEY-ID
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR-PRIVATE-KEY-HERE
-----END PRIVATE KEY-----"
```

### 4. Restart Dev Server
```bash
npm run dev
```

That's it! Your meetings now use JaaS 🎉

## Pricing
- **Free**: 25 monthly active users
- **Paid**: $0.33/user/month
- **Promo**: Use code `MJS2JAAS` for 80% off first 3 months

## Quick Links
- Console: [https://jaas.8x8.vc/#/dashboard](https://jaas.8x8.vc/#/dashboard)
- Docs: [https://developer.8x8.com/jaas](https://developer.8x8.com/jaas/docs)
- Full Setup Guide: See `JAAS-SETUP.md`

## Testing
1. Go to `/admin` → Meetings tab
2. Create a test meeting
3. Go to `/meetings`
4. Join the meeting
5. Check console for: "Jitsi Meet initialized with JaaS"
