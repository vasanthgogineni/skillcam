# Step-by-Step Deployment Guide

Follow these exact steps to deploy your Flask server and connect it to Vercel.

## Part 1: Deploy Flask Server to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended) or email
4. Authorize Railway to access your GitHub repositories

### Step 2: Create New Project
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select your `skillcam` repository
4. Click **"Deploy Now"**

### Step 3: Configure the Service
1. Railway will detect the Dockerfile automatically
2. Wait for the initial build to complete (may take 2-3 minutes)
3. Click on the service to open settings

### Step 4: Add Environment Variables
1. In the service settings, click the **"Variables"** tab
2. Click **"New Variable"** and add each of these:

   **Variable 1:**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-actual-openai-key-here`
   - Click **"Add"**

   **Variable 2:**
   - Name: `SUPABASE_URL`
   - Value: `https://your-project-id.supabase.co`
   - Click **"Add"**

   **Variable 3:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `your-service-role-key-here`
   - Click **"Add"**

   **Variable 4 (Optional but recommended):**
   - Name: `FLASK_ENV`
   - Value: `production`
   - Click **"Add"**

3. After adding variables, Railway will automatically redeploy

### Step 5: Get Your Flask Server URL
1. In the service settings, click the **"Settings"** tab
2. Scroll down to **"Networking"** section
3. Find **"Public Domain"** or **"Generate Domain"**
4. Click **"Generate Domain"** if needed
5. Copy the URL (it will look like: `https://skillcam-flask-ai-production.up.railway.app`)
6. **Save this URL** - you'll need it in the next part!

### Step 6: Test Your Flask Server
1. Open a new browser tab
2. Go to: `https://your-railway-url.railway.app/`
3. You should see: `{"status":"ok"}`
4. If you see this, your Flask server is working! ✅

---

## Part 2: Configure Vercel Frontend

### Step 7: Go to Vercel Dashboard
1. Go to https://vercel.com
2. Log in to your account
3. Find your `skillcam` project in the dashboard
4. Click on the project name to open it

### Step 8: Add Environment Variable to Vercel
1. In your Vercel project, click on **"Settings"** (top menu)
2. Click on **"Environment Variables"** (left sidebar)
3. Click **"Add New"** button

### Step 9: Add Flask API URL
1. In the **"Key"** field, type: `VITE_FLASK_API_URL`
2. In the **"Value"** field, paste your Railway URL from Step 5:
   - Example: `https://skillcam-flask-ai-production.up.railway.app`
   - **Important:** Do NOT include `/upload` or trailing slash
3. Under **"Environment"**, select all three:
   - ☑ Production
   - ☑ Preview
   - ☑ Development
4. Click **"Save"**

### Step 10: Redeploy Vercel
1. Go to the **"Deployments"** tab (top menu)
2. Find the latest deployment
3. Click the **"⋯"** (three dots) menu
4. Click **"Redeploy"**
5. Confirm by clicking **"Redeploy"** again
6. Wait for deployment to complete (usually 1-2 minutes)

---

## Part 3: Verify Everything Works

### Step 11: Test the Integration
1. Go to your Vercel deployment URL (e.g., `https://skillcam.vercel.app`)
2. Log in to your app
3. Navigate to the upload page
4. Upload a test video
5. Wait for the AI analysis to complete

### Step 12: Check for Errors
1. Open browser **Developer Tools** (F12 or Right-click → Inspect)
2. Go to **"Console"** tab
3. Look for any errors related to the Flask API
4. Go to **"Network"** tab
5. Look for requests to your Railway URL
6. Check if they return `200 OK` status

### Step 13: Verify Flask Server Logs
1. Go back to Railway dashboard
2. Click on your Flask service
3. Click on **"Deployments"** tab
4. Click on the latest deployment
5. Click **"View Logs"**
6. You should see logs when videos are processed

---

## Troubleshooting

### Problem: Flask server returns 404
**Solution:**
- Make sure the Railway URL doesn't have a trailing slash
- Check that the service is actually deployed (green status)
- Verify environment variables are set correctly

### Problem: CORS errors in browser console
**Solution:**
1. Go to Railway → Your service → Variables
2. Add new variable:
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://skillcam.vercel.app,https://skillcam-vasanth-goginenis-projects.vercel.app`
   - (Add all your Vercel URLs, comma-separated)
3. Redeploy Railway service

### Problem: "Failed to download video from storage"
**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)
- Check that `SUPABASE_URL` is correct
- Verify the video path in Supabase storage is correct

### Problem: Timeout errors
**Solution:**
1. Railway free tier has 500s timeout
2. For longer videos, consider:
   - Reducing `MAX_FRAMES_TO_ANALYZE` in `app.py`
   - Upgrading Railway plan
   - Processing videos asynchronously

### Problem: Frontend still uses localhost
**Solution:**
1. Make sure you added `VITE_FLASK_API_URL` in Vercel
2. Make sure you redeployed Vercel after adding the variable
3. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## Quick Reference: URLs to Save

After deployment, save these URLs:

1. **Flask Server (Railway):**
   ```
   https://your-service-name.up.railway.app
   ```

2. **Frontend (Vercel):**
   ```
   https://skillcam.vercel.app
   ```

3. **Test Flask Health:**
   ```
   https://your-service-name.up.railway.app/
   ```
   Should return: `{"status":"ok"}`

---

## Summary Checklist

- [ ] Railway account created
- [ ] Project deployed from GitHub
- [ ] Environment variables added (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Flask server URL copied
- [ ] Flask health check works (`/` endpoint returns `{"status":"ok"}`)
- [ ] VITE_FLASK_API_URL added to Vercel
- [ ] Vercel redeployed
- [ ] Test video upload works
- [ ] No errors in browser console
- [ ] Flask logs show successful processing

---

## Need Help?

If you get stuck:
1. Check Railway logs for Flask errors
2. Check Vercel deployment logs for build errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Make sure both services are deployed and running

