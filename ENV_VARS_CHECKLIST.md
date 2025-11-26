# Environment Variables Checklist

## What You Have vs What You Need

### ✅ What You Already Have (for Express/Vercel):
- `DATABASE_URL` - ✅ You have this
- `SUPABASE_URL` - ✅ You have this  
- `SUPABASE_ANON_KEY` - ✅ You have this (for frontend)
- `SESSION_SECRET` - ✅ You have this
- `NODE_ENV` - ✅ You have this
- `PORT` - ✅ You have this

### ❌ What You Need for Flask Server (Railway):

1. **`OPENAI_API_KEY`** - ❌ You need this
   - Get it from: https://platform.openai.com/api-keys
   - Format: `sk-...`

2. **`SUPABASE_SERVICE_ROLE_KEY`** - ❌ You need this (different from ANON_KEY!)
   - Get it from: Supabase Dashboard → Settings → API → service_role key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ This is NOT the same as `SUPABASE_ANON_KEY`

3. **`SUPABASE_URL`** - ✅ You already have this
   - Use the same value you have

## Why SERVICE_ROLE_KEY vs ANON_KEY?

- **ANON_KEY**: Limited permissions, safe for frontend, can't access private storage
- **SERVICE_ROLE_KEY**: Full admin access, can access private storage, **MUST be server-side only**

The Flask server needs SERVICE_ROLE_KEY because it needs to:
- Download videos from private Supabase Storage buckets
- Access files without user authentication

## Where to Find SERVICE_ROLE_KEY

1. Go to https://supabase.com
2. Select your project
3. Click **Settings** (⚙️ icon)
4. Click **API** in the left menu
5. Scroll to **"Project API keys"** section
6. Find **"service_role"** (NOT "anon public")
7. Click the 👁️ eye icon to reveal
8. Click **Copy**

**⚠️ Important:** 
- Never commit this key to GitHub
- Never use it in frontend code
- Only use it in server-side code (Railway, backend services)

## Quick Setup Summary

### For Railway (Flask Server):
```
OPENAI_API_KEY=sk-...                    ← Get from OpenAI
SUPABASE_URL=https://xxx.supabase.co     ← You have this
SUPABASE_SERVICE_ROLE_KEY=eyJ...        ← Get from Supabase (service_role)
FLASK_ENV=production                     ← Optional
```

### For Vercel (Frontend):
```
VITE_FLASK_API_URL=https://your-railway-url.railway.app  ← After Railway deployment
```

## Testing Your Keys

### Test OpenAI Key:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key-here"
```
Should return a list of models (not an error).

### Test Supabase SERVICE_ROLE_KEY:
The Flask server will test this automatically when it tries to download videos. If it fails, check:
- You're using service_role (not anon)
- The key is correct (no extra spaces)
- Your Supabase project is active


