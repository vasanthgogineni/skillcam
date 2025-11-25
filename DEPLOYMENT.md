# Flask AI Server Deployment Guide

This guide explains how to deploy the Flask AI video analysis server to production.

## Overview

The Flask server:
- Downloads videos from Supabase Storage
- Extracts frames using ffmpeg
- Analyzes frames with OpenAI Vision API
- Returns structured analysis results

## Prerequisites

- Docker installed (for local testing)
- Account on a cloud platform (Railway, Render, Google Cloud Run, etc.)
- Environment variables configured:
  - `OPENAI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Local Development with Docker

### Build and run with Docker Compose:

```bash
docker-compose up --build
```

The Flask server will be available at `http://localhost:5002`

### Or build and run manually:

```bash
# Build the image
docker build -t skillcam-flask-ai .

# Run the container
docker run -p 5002:5002 \
  -e OPENAI_API_KEY=your_key \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  skillcam-flask-ai
```

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Install Railway CLI** (optional but recommended):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy from GitHub**:
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Connect your GitHub repo
   - Railway will auto-detect the `railway.json` config
   - Add environment variables in Railway dashboard

3. **Or deploy via CLI**:
   ```bash
   railway init
   railway up
   railway variables set OPENAI_API_KEY=your_key
   railway variables set SUPABASE_URL=your_url
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

4. **Get your deployment URL** from Railway dashboard and update frontend env var

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Add environment variables in Render dashboard
6. Deploy!

### Option 3: Google Cloud Run

1. **Build and push image**:
   ```bash
   # Set your project
   gcloud config set project YOUR_PROJECT_ID
   
   # Build and push
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/skillcam-flask-ai
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy skillcam-flask-ai \
     --image gcr.io/YOUR_PROJECT_ID/skillcam-flask-ai \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars OPENAI_API_KEY=your_key,SUPABASE_URL=your_url,SUPABASE_SERVICE_ROLE_KEY=your_key \
     --memory 2Gi \
     --timeout 300 \
     --max-instances 10
   ```

### Option 4: AWS ECS/Fargate

1. **Build and push to ECR**:
   ```bash
   aws ecr create-repository --repository-name skillcam-flask-ai
   docker build -t skillcam-flask-ai .
   docker tag skillcam-flask-ai:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/skillcam-flask-ai:latest
   aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com
   docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/skillcam-flask-ai:latest
   ```

2. **Create ECS task definition** with environment variables
3. **Deploy to Fargate** with appropriate memory (2GB+) and timeout (300s)

## Frontend Configuration

After deploying, update your frontend environment variables:

1. **Create/update `.env` file** in the project root:
   ```env
   VITE_FLASK_API_URL=https://your-flask-server.railway.app
   ```

2. **For Vercel deployment**, add the environment variable in Vercel dashboard:
   - Go to your Vercel project settings
   - Add `VITE_FLASK_API_URL` with your Flask server URL

3. **Rebuild and redeploy** your frontend

## Environment Variables

### Required:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for accessing storage)

### Optional:
- `PORT` - Server port (default: 5002)
- `FLASK_ENV` - Set to `production` for production
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (default: all)

## Health Check

The server has a health check endpoint:
```
GET /
```

Returns: `{"status": "ok"}`

## Resource Requirements

- **Memory**: Minimum 1GB, recommended 2GB (for video processing)
- **CPU**: 1-2 cores recommended
- **Timeout**: 300 seconds (5 minutes) for video processing
- **Storage**: Ephemeral (uploads/frames are cleaned up after processing)

## Monitoring

- Check logs in your deployment platform dashboard
- Monitor OpenAI API usage and costs
- Set up alerts for failed requests

## Troubleshooting

### ffmpeg not found
- Ensure Dockerfile includes ffmpeg installation
- Check that the container has ffmpeg: `docker exec <container> ffmpeg -version`

### Timeout errors
- Increase timeout in deployment config (300s recommended)
- Consider processing videos asynchronously for longer videos

### Memory issues
- Increase container memory allocation
- Reduce `MAX_FRAMES_TO_ANALYZE` in `app.py`

### CORS errors
- Set `ALLOWED_ORIGINS` environment variable
- Or update CORS config in `app.py`

## Cost Optimization

- Use `gpt-4o-mini` for both vision and summary (already configured)
- Limit `MAX_FRAMES_TO_ANALYZE` (currently 10)
- Consider caching results for duplicate videos
- Monitor OpenAI API usage

## Security

- Never commit `.env` files
- Use service role keys only on the server (never in frontend)
- Enable CORS restrictions in production
- Use HTTPS for all API calls

