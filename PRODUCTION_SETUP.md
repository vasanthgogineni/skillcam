# Production Setup Summary

## What Was Done

Your Flask AI video analysis server has been productionalized with Docker and deployment configurations.

## Files Created

1. **`Dockerfile`** - Production-ready Docker image with:
   - Python 3.11
   - ffmpeg for video processing
   - All Python dependencies
   - Gunicorn for production server
   - Health checks

2. **`docker-compose.yml`** - Local development with Docker

3. **`.dockerignore`** - Excludes unnecessary files from Docker build

4. **`railway.json`** - Railway deployment configuration

5. **`render.yaml`** - Render.com deployment configuration

6. **`DEPLOYMENT.md`** - Comprehensive deployment guide

7. **`FLASK_README.md`** - Quick start and API documentation

## Files Modified

1. **`app.py`** - Enhanced with:
   - Automatic cleanup of temporary files
   - Better error handling
   - Production CORS configuration
   - Environment-based configuration

2. **`requirements.txt`** - Added `gunicorn` for production

3. **`client/src/pages/UploadPage.tsx`** - Updated to use environment variable `VITE_FLASK_API_URL` instead of hardcoded localhost

## Next Steps

### 1. Deploy Flask Server

Choose one of these platforms:

**Option A: Railway (Easiest)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Add environment variables
railway variables set OPENAI_API_KEY=your_key
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
```

**Option B: Render**
1. Go to render.com
2. Connect GitHub repo
3. Render auto-detects `render.yaml`
4. Add environment variables
5. Deploy!

**Option C: Google Cloud Run**
See `DEPLOYMENT.md` for detailed instructions.

### 2. Update Frontend Environment Variable

After deploying, get your Flask server URL and add it to Vercel:

1. Go to Vercel project settings
2. Add environment variable:
   - Key: `VITE_FLASK_API_URL`
   - Value: `https://your-flask-server.railway.app` (or your deployment URL)
3. Redeploy frontend

### 3. Test the Integration

1. Upload a video through your frontend
2. Check that it calls your deployed Flask server
3. Verify the analysis completes successfully

## Environment Variables Needed

### Flask Server (add to deployment platform):
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL  
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `PORT` - Usually auto-set by platform (default: 5002)

### Frontend (add to Vercel):
- `VITE_FLASK_API_URL` - Your deployed Flask server URL

## Local Development

### Run Flask locally:
```bash
# With Docker
docker-compose up

# Or without Docker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Run Frontend:
```bash
npm run dev
```

The frontend will use `http://localhost:5002` by default (or `VITE_FLASK_API_URL` if set).

## Testing

Test the Flask server health endpoint:
```bash
curl https://your-flask-server.railway.app/
```

Should return: `{"status": "ok"}`

## Cost Considerations

- OpenAI API: ~$0.01-0.05 per video analysis (depending on video length)
- Hosting: Railway/Render free tier is usually sufficient for low traffic
- Storage: Videos stored in Supabase (check your plan limits)

## Monitoring

- Check deployment platform logs for errors
- Monitor OpenAI API usage in OpenAI dashboard
- Set up alerts for failed requests

## Troubleshooting

**Flask server not responding:**
- Check environment variables are set correctly
- Verify ffmpeg is installed (Docker includes it)
- Check logs in deployment platform

**CORS errors:**
- Set `ALLOWED_ORIGINS` environment variable
- Or update CORS config in `app.py`

**Timeout errors:**
- Increase timeout in deployment config (300s recommended)
- Consider async processing for longer videos

## Support

See `DEPLOYMENT.md` for detailed deployment instructions and `FLASK_README.md` for API documentation.

