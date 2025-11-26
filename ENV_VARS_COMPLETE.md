# Complete Environment Variables Guide

## 🚀 Vercel (Frontend + Express Server)

### Required Environment Variables

1. **`DATABASE_URL`** ⚠️ REQUIRED
   - Your Neon DB connection string
   - Format: `postgresql://user:password@host:port/database?sslmode=require`
   - Used by: Express server for all database operations

2. **`SUPABASE_URL`** ⚠️ REQUIRED
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`
   - Used by: Express server for Supabase Storage operations

3. **`SUPABASE_ANON_KEY`** ⚠️ REQUIRED
   - Your Supabase anonymous/public key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Used by: 
     - Frontend for Supabase Auth (login/registration)
     - Express server for Supabase Storage uploads

4. **`SESSION_SECRET`** ⚠️ REQUIRED
   - Secret key for Express session management
   - Format: Any long random string (e.g., `your-super-secret-key-here-12345`)
   - Used by: Express server for session cookies
   - ⚠️ Generate a strong random string for production!

5. **`VITE_FLASK_API_URL`** ⚠️ REQUIRED (after Flask deployment)
   - Your Railway Flask server URL
   - Format: `https://your-service.up.railway.app` (no trailing slash)
   - Used by: Frontend to call Flask AI analysis API
   - ⚠️ Add this AFTER you deploy Flask to Railway

### Optional Environment Variables

6. **`NODE_ENV`** (Optional)
   - Set to `production` for production
   - Default: `development`
   - Used by: Express server configuration

7. **`PORT`** (Optional)
   - Server port (Vercel sets this automatically)
   - Default: `5001` (but Vercel overrides this)
   - ⚠️ Don't set manually on Vercel - it's auto-set

---

## 🐍 Railway (Flask AI Server)

### Required Environment Variables

1. **`OPENAI_API_KEY`** ⚠️ REQUIRED
   - Your OpenAI API key
   - Format: `sk-...`
   - Get it from: https://platform.openai.com/api-keys
   - Used by: Flask server for video analysis

2. **`SUPABASE_URL`** ⚠️ REQUIRED
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`
   - Used by: Flask server to download videos from Supabase Storage
   - ⚠️ Same value as Vercel

3. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️ REQUIRED
   - Your Supabase service_role key (NOT anon key!)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get it from: Supabase Dashboard → Settings → API → service_role
   - Used by: Flask server to access private Supabase Storage buckets
   - ⚠️ This is different from SUPABASE_ANON_KEY!

### Optional Environment Variables

4. **`FLASK_ENV`** (Optional but recommended)
   - Set to `production` for production
   - Default: `development`
   - Used by: Flask server for CORS and error handling

5. **`ALLOWED_ORIGINS`** (Optional)
   - Comma-separated list of allowed CORS origins
   - Format: `https://skillcam.vercel.app,https://skillcam-vasanth-goginenis-projects.vercel.app`
   - Used by: Flask server for CORS configuration
   - ⚠️ Only needed if you get CORS errors

6. **`PORT`** (Optional - DO NOT SET MANUALLY)
   - Railway automatically sets this
   - Default: `5002` (in Dockerfile)
   - ⚠️ **DO NOT** add this manually - Railway sets it automatically!

---

## 📋 Quick Setup Checklist

### Vercel Environment Variables

```
✅ DATABASE_URL
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SESSION_SECRET
✅ VITE_FLASK_API_URL (add after Railway deployment)
```

### Railway Environment Variables

```
✅ OPENAI_API_KEY
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ FLASK_ENV=production (optional but recommended)
```

---

## 🔐 Security Notes

### Never Commit These:
- ❌ `.env` files
- ❌ API keys
- ❌ Database URLs with passwords
- ❌ Service role keys

### Safe to Commit:
- ✅ `.env.example` (with placeholder values)
- ✅ Code that reads from `process.env`

### Key Differences:

| Key | Where Used | Security Level |
|-----|------------|----------------|
| `SUPABASE_ANON_KEY` | Frontend + Express | ✅ Safe for frontend (has RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Flask server only | ⚠️ Server-side only! Never in frontend |
| `OPENAI_API_KEY` | Flask server only | ⚠️ Server-side only! Never in frontend |
| `DATABASE_URL` | Express server only | ⚠️ Server-side only! Never in frontend |
| `SESSION_SECRET` | Express server only | ⚠️ Server-side only! Never in frontend |

---

## 🎯 Step-by-Step Setup

### Step 1: Set up Vercel (Do this first)

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add these 4 variables:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SESSION_SECRET`
3. Save and redeploy

### Step 2: Deploy Flask to Railway

1. Deploy to Railway (follow STEP_BY_STEP_DEPLOYMENT.md)
2. Add these 3 variables:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Get your Railway URL

### Step 3: Connect Vercel to Flask

1. Go back to Vercel → Environment Variables
2. Add: `VITE_FLASK_API_URL` = Your Railway URL
3. Redeploy Vercel

---

## 🧪 Testing Your Setup

### Test Vercel Variables:
```bash
# Check if Express server starts
# Check if you can login/register
# Check if database queries work
```

### Test Railway Variables:
```bash
# Visit: https://your-railway-url.railway.app/
# Should see: {"status":"ok"}

# Test video analysis from Vercel frontend
```

---

## ❓ Troubleshooting

### "DATABASE_URL must be set"
- ✅ Add `DATABASE_URL` to Vercel
- ✅ Make sure it's set for Production, Preview, and Development

### "SUPABASE_SERVICE_ROLE_KEY is required"
- ✅ Add `SUPABASE_SERVICE_ROLE_KEY` to Railway
- ⚠️ Make sure it's the service_role key, NOT anon key

### "Failed to download video from storage"
- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` is correct in Railway
- ✅ Check `SUPABASE_URL` matches in both Vercel and Railway

### CORS errors
- ✅ Add `ALLOWED_ORIGINS` to Railway with your Vercel URLs
- ✅ Or update CORS config in `app.py`

### Frontend can't reach Flask
- ✅ Check `VITE_FLASK_API_URL` is set in Vercel
- ✅ Make sure Railway URL is correct (no trailing slash)
- ✅ Redeploy Vercel after adding the variable

---

## 📝 Example .env File (Local Development)

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Session
SESSION_SECRET=your-super-secret-key-change-in-production

# OpenAI (for Flask)
OPENAI_API_KEY=sk-...

# Flask API (for frontend)
VITE_FLASK_API_URL=http://localhost:5002

# Environment
NODE_ENV=development
PORT=5001
FLASK_ENV=development
```

⚠️ **Never commit this file!** Use `.env.example` with placeholder values.


