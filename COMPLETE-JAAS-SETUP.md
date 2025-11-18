# Complete Your JaaS Setup

## ✅ What's Already Done

I've added most of your JaaS configuration to `.env.local`:

- ✅ App ID: `vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d`
- ✅ Private Key: Loaded from `vercatryx.pk`
- ✅ Public Key: From `vercatryx.pub`

## 🔧 What You Need to Do

### Find Your API Key ID

1. Go to the [JaaS Console](https://jaas.8x8.vc/#/dashboard)
2. Navigate to **API Keys** section
3. Look for your key (the one matching `vercatryx.pub`)
4. Copy the **Key ID** - it should look something like:
   - Format: `vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/abc123def456`
   - It starts with your App ID, followed by `/`, then the unique key identifier

### Update .env.local

Open `.env.local` and find this line:

```bash
JAAS_API_KEY_ID=vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/YOUR-KEY-ID-FROM-CONSOLE
```

Replace `YOUR-KEY-ID-FROM-CONSOLE` with the actual key ID from the JaaS console.

**Example:**
If your Key ID in the console is: `vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/a1b2c3d4`

Then change it to:
```bash
JAAS_API_KEY_ID=vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/a1b2c3d4
```

## 🚀 Test Your Setup

After updating the API Key ID:

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Create a test meeting:**
   - Go to `http://localhost:3000/admin`
   - Click "Meetings" tab
   - Click "Create Meeting"
   - Fill out the form and create a meeting

3. **Join the meeting:**
   - Go to `http://localhost:3000/meetings`
   - Click "Join Meeting"
   - You should see the Jitsi interface load

4. **Check the console:**
   - Open browser Developer Tools (F12)
   - Look for: "Jitsi Meet initialized with JaaS for room: ..."
   - No errors about authentication or tokens

## 🔍 Where to Find the Key ID in JaaS Console

The JaaS Console API Keys page typically shows:

```
App ID: vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d

API Keys:
┌─────────────────────────────────────────────────────────────────┐
│ Key ID: vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/xxxxx│  <-- Copy this entire thing
│ Public Key: vercatryx.pub                                       │
│ Status: Active                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Copy the **entire** Key ID including the app ID prefix and the `/` separator.

## ❓ Troubleshooting

### Can't find the Key ID?
- Make sure you uploaded the public key (`vercatryx.pub`) to JaaS
- The Key ID is generated when you create/upload the API key
- Check the "API Keys" or "Credentials" section in the JaaS dashboard

### Still not working?
1. Double-check all environment variables are set correctly
2. Ensure there are no extra spaces or quotes
3. Restart the dev server
4. Check browser console for specific error messages
5. Verify the public key uploaded to JaaS matches `vercatryx.pub`

## 📝 Your Current Configuration

```bash
# In .env.local
NEXT_PUBLIC_JAAS_APP_ID=vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d
JAAS_APP_ID=vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d
JAAS_API_KEY_ID=vpaas-magic-cookie-37c712fd3934492390e523fccee31e2d/YOUR-KEY-ID  ← UPDATE THIS
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"  ← Already set
```

Once you update the `JAAS_API_KEY_ID`, you're all done! 🎉
