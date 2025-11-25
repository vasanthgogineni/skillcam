# Flask AI Video Analysis Server

This Flask server handles video analysis using OpenAI's Vision API.

## Quick Start

### Local Development (without Docker)

1. **Install dependencies**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Install ffmpeg**:
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your keys
   ```

4. **Run the server**:
   ```bash
   python app.py
   ```

   Server runs on `http://localhost:5002`

### Local Development (with Docker)

```bash
docker-compose up
```

## API Endpoints

### `GET /`
Health check endpoint.

**Response:**
```json
{"status": "ok"}
```

### `POST /upload`
Analyze a video from Supabase Storage.

**Request:**
```json
{
  "videoPath": "submission-videos/user-id/video.mp4"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "video_filename": "video.mp4",
  "frame_analyses": [
    {
      "timestamp": 0.0,
      "description": "...",
      "errors": [],
      "safety_issues": [],
      "skill_score": 85
    }
  ],
  "metrics": {
    "overallScore": 85,
    "accuracy": 90,
    "stability": 80,
    "toolUsage": 85,
    "completionTime": "2m 30s"
  },
  "feedback": "Markdown formatted feedback...",
  "final_summary": "Markdown formatted feedback..." // deprecated, use feedback
}
```

## Environment Variables

- `OPENAI_API_KEY` (required) - OpenAI API key
- `SUPABASE_URL` (required) - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` (required) - Supabase service role key
- `PORT` (optional) - Server port (default: 5002)
- `FLASK_ENV` (optional) - Set to `production` for production
- `ALLOWED_ORIGINS` (optional) - Comma-separated CORS origins

## Configuration

Edit these constants in `app.py`:

- `FPS` - Frames per second to extract (default: 1)
- `MAX_FRAMES_TO_ANALYZE` - Max frames to analyze (default: 10)
- `VISION_MODEL` - OpenAI vision model (default: "gpt-4o-mini")
- `SUMMARY_MODEL` - OpenAI summary model (default: "gpt-4o-mini")

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy to Railway:**
1. Push code to GitHub
2. Connect repo to Railway
3. Add environment variables
4. Deploy!

## Testing

Test the health endpoint:
```bash
curl http://localhost:5002/
```

Test video analysis (replace with actual video path):
```bash
curl -X POST http://localhost:5002/upload \
  -H "Content-Type: application/json" \
  -d '{"videoPath": "submission-videos/user-id/video.mp4"}'
```

