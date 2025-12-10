import os
import uuid
import base64
import json
import subprocess
import requests
import shutil
import atexit
import time
from pathlib import Path
from typing import List, Dict

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# --- Supabase config ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- config ---
UPLOAD_FOLDER = Path("uploads")
FRAMES_FOLDER = Path("frames")
UPLOAD_FOLDER.mkdir(exist_ok=True)
FRAMES_FOLDER.mkdir(exist_ok=True)

FPS = 0.5  # lower fps to reduce frame count and token usage
MAX_FRAMES_TO_ANALYZE = 6  # fewer frames analyzed to cut cost/TPM
MAX_RETRIES = int(os.environ.get("OPENAI_MAX_RETRIES", 5))
RETRY_BASE_DELAY = float(os.environ.get("OPENAI_RETRY_BASE_DELAY", 0.8))

# Models – tweak if you want
VISION_MODEL = "gpt-4o-mini"
SUMMARY_MODEL = "gpt-4o-mini"

# Cleanup function for temporary files
def cleanup_temp_files():
    """Clean up temporary upload and frame directories"""
    try:
        if UPLOAD_FOLDER.exists():
            for file in UPLOAD_FOLDER.glob("*"):
                if file.is_file():
                    file.unlink()
        if FRAMES_FOLDER.exists():
            for dir_path in FRAMES_FOLDER.iterdir():
                if dir_path.is_dir():
                    shutil.rmtree(dir_path, ignore_errors=True)
    except Exception as e:
        print(f"Warning: Error during cleanup: {e}")

# Register cleanup on exit
atexit.register(cleanup_temp_files)

# OpenAI client – expects OPENAI_API_KEY in env
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

app = Flask(__name__)

# CORS configuration - allow specific origins in production
if os.environ.get("FLASK_ENV") == "development":
    CORS(app)  # Allow all origins in development
else:
    # In production, allow specific origins
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if allowed_origins and allowed_origins[0]:
        CORS(app, origins=allowed_origins)
    else:
        CORS(app)  # Fallback to allow all if not configured


# ---------- helpers ----------

def extract_frames(video_path: Path, out_dir: Path, fps: int = 1) -> List[Path]:
    """
    Use ffmpeg to extract frames from the video at a fixed FPS.
    Returns a sorted list of frame image paths.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = out_dir / "frame_%04d.jpg"

    cmd = [
        "ffmpeg",
        "-i",
        str(video_path),
        "-vf",
        f"fps={fps}",
        "-q:v",
        "2",
        str(pattern),
    ]
    # Suppress ffmpeg noise in console
    subprocess.run(
        cmd,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    frames = sorted(out_dir.glob("frame_*.jpg"))
    return frames


def encode_image_to_data_url(path: Path) -> str:
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    # jpeg is fine for our ffmpeg output
    return f"data:image/jpeg;base64,{b64}"


def chat_with_retry(model: str, messages: List[Dict], **kwargs):
    """
    Call OpenAI with basic exponential backoff on rate limits.
    """
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs,
            )
        except Exception as e:
            last_err = e
            msg = str(e).lower()
            is_rate = "rate limit" in msg or "429" in msg or "tpm" in msg
            if is_rate and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                print(f"⚠️ OpenAI rate limit (attempt {attempt}/{MAX_RETRIES}), retrying in {delay:.2f}s")
                time.sleep(delay)
                continue
            print(f"❌ OpenAI error (attempt {attempt}): {e}")
            raise e
    raise last_err


def analyze_frame_with_gpt(frame_path: Path, timestamp_sec: float) -> Dict:
    """
    Send a single frame to a vision-capable GPT model.
    Ask it to return a JSON blob describing that moment in the video.
    """
    image_url = encode_image_to_data_url(frame_path)

    prompt = f"""
You are analyzing a single frame from a vocational training video.
If the frame shows a screw tightening task (screwdriver, drill/driver, etc.), give a skill_score around 83 unless clear evidence warrants lower/higher. Focus on what needs improvement: alignment/angle, grip stability, drive speed/pressure, workpiece support, bit/screw positioning, and safety. Add gloves as a safety concern. If the technique looks fine, say so briefly. Keep feedback concise—avoid filler. Do NOT give any feedback about wearing goggles/eye protection.

Return a *JSON object only* with the following keys:

- "timestamp": float, seconds from the start of the video ({timestamp_sec})
- "description": short natural language description of what the trainee is doing
- "errors": list of strings (specific mistakes or technique issues)
- "safety_issues": list of strings (any safety concerns)
- "skill_score": integer between 0 and 100 estimating how well this step is executed

Do not include any explanation outside of JSON.
""".strip()

    resp = chat_with_retry(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                ],
            }
        ],
        max_tokens=500,
    )

    raw = resp.choices[0].message.content

    # content can be a string or a list of parts; handle both
    if isinstance(raw, list):
        raw_text = "".join(part.get("text", "") for part in raw if isinstance(part, dict))
    else:
        raw_text = raw or ""

    try:
        data = json.loads(raw_text)
    except Exception:
        # Fallback: wrap whatever we got
        data = {
            "timestamp": timestamp_sec,
            "description": raw_text.strip(),
            "errors": [],
            "safety_issues": [],
            "skill_score": 0,
        }

    # Guarantee timestamp exists
    if "timestamp" not in data:
        data["timestamp"] = timestamp_sec

    return data


def global_analysis_with_gpt(frame_analyses: List[Dict]) -> Dict:
    """
    Send all per-frame JSONs to a text model for a global summary.
    Returns a dictionary with structured metrics and feedback.
    """
    system_msg = (
        "You are an expert vocational trainer. "
        "You give precise, structured, and encouraging feedback. "
        "You must return valid JSON only, no additional text."
    )

    user_prompt = """
You are given JSON analyses for several frames from a trainee's task video.

Analyze the frame data and return a JSON object with the following structure:

{
  "overallScore": <integer 0-100, overall performance score>,
  "accuracy": <integer 0-100, how accurately the trainee performed the task>,
  "stability": <integer 0-100, how stable and controlled the movements were>,
  "toolUsage": <integer 0-100, how effectively the trainee used the tools>,
  "completionTime": <string, estimated time to complete task in format like "2m 30s" or "N/A" if not applicable>,
  "feedback": "<markdown text with: 1) Overall assessment (1-2 sentences), 2) Key strengths (bullet list), 3) Recurring mistakes (bullet list), 4) Safety issues (bullet list), 5) Next steps for practice (numbered list). Use clear markdown headings and bullets, but avoid using asterisks for emphasis - use plain text or bold markdown **text** only when necessary.>"
}

Calculate the metrics based on:
- overallScore: Average of skill_score from frames, adjusted for consistency
- accuracy: Based on error frequency and precision of movements
- stability: Based on consistency of skill_score across frames
- toolUsage: Based on proper tool handling and technique
- completionTime: Estimate from frame timestamps or "N/A"

Return ONLY the JSON object, no additional text or explanation.
""".strip()

    try:
        resp = chat_with_retry(
            model=SUMMARY_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {
                    "role": "user",
                    "content": user_prompt
                    + "\n\nHere is the JSON data:\n\n"
                    + json.dumps(frame_analyses, indent=2),
                },
            ],
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        # Fallback if JSON mode is not supported or rate-limited
        print(f"JSON mode not supported or retry exhausted, falling back to text mode: {e}")
        resp = chat_with_retry(
            model=SUMMARY_MODEL,
            messages=[
                {"role": "system", "content": system_msg + " Return ONLY valid JSON, no additional text."},
                {
                    "role": "user",
                    "content": user_prompt
                    + "\n\nHere is the JSON data:\n\n"
                    + json.dumps(frame_analyses, indent=2),
                },
            ],
            max_tokens=1200,
        )

    raw = resp.choices[0].message.content
    
    try:
        data = json.loads(raw)
        
        # Ensure all required fields exist with defaults
        result = {
            "overallScore": int(data.get("overallScore", 0)),
            "accuracy": int(data.get("accuracy", 0)),
            "stability": int(data.get("stability", 0)),
            "toolUsage": int(data.get("toolUsage", 0)),
            "completionTime": str(data.get("completionTime", "N/A")),
            "feedback": str(data.get("feedback", "")),
        }
        
        # Validate ranges
        for key in ["overallScore", "accuracy", "stability", "toolUsage"]:
            result[key] = max(0, min(100, result[key]))
        
        return result
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        print(f"Raw response: {raw}")
        
        # Fallback: calculate from frame analyses
        skill_scores = [f.get("skill_score", 0) for f in frame_analyses if f.get("skill_score")]
        avg_score = int(sum(skill_scores) / len(skill_scores)) if skill_scores else 0
        
        return {
            "overallScore": avg_score,
            "accuracy": avg_score,
            "stability": avg_score,
            "toolUsage": avg_score,
            "completionTime": "N/A",
            "feedback": raw if raw else "Analysis completed. Review the frame-by-frame details for specific feedback.",
        }


# ---------- routes ----------


@app.route("/")
def health():
    return jsonify({"status": "ok"})


def download_video_from_supabase(bucket: str, storage_path: str, local_path: Path) -> bool:
    """Download video from Supabase Storage to local path"""
    try:
        # Ensure we don't pass the bucket name twice
        if storage_path.startswith(f"{bucket}/"):
            storage_path = storage_path[len(bucket)+1 :]

        # Get signed URL (valid for 1 hour)
        response = supabase.storage.from_(bucket).create_signed_url(storage_path, 3600)

        if not response or "signedURL" not in response:
            print(f"Failed to get signed URL for {storage_path}")
            return False

        signed_url = response["signedURL"]

        # Download the file
        file_response = requests.get(signed_url, timeout=60)
        file_response.raise_for_status()

        # Save to local path
        with open(local_path, "wb") as f:
            f.write(file_response.content)

        print(f"✅ Downloaded video from Supabase: {storage_path} -> {local_path}")
        return True
    except Exception as e:
        print(f"❌ Error downloading video: {e}")
        return False


@app.route("/upload", methods=["POST"])
def upload():
    """
    Accepts JSON with 'videoPath' pointing to a video in Supabase Storage.
    - Downloads video from Supabase
    - Extracts frames with ffmpeg
    - Runs GPT per-frame analysis
    - Runs GPT global summary
    - Returns JSON:

      {
        "job_id": str,
        "video_filename": str,
        "frame_analyses": [...],
        "final_summary": str
      }
    """
    job_id = None
    video_path = None
    frames_dir = None
    
    try:
        data = request.get_json()

        if not data or "videoPath" not in data:
            return jsonify({"error": "No 'videoPath' in request"}), 400

        storage_path = data["videoPath"]
        job_id = str(uuid.uuid4())
        ext = Path(storage_path).suffix or ".mp4"
        video_path = UPLOAD_FOLDER / f"{job_id}{ext}"

        # Download video from Supabase
        bucket = data.get("bucket") or "submission-videos"
        print(f"🎬 Downloading video from Supabase: {bucket}/{storage_path}")
        if not download_video_from_supabase(bucket, storage_path, video_path):
            return jsonify({"error": "Failed to download video from storage"}), 500

        print(f"✅ Video downloaded: {video_path}")

        # Extract frames
        frames_dir = FRAMES_FOLDER / job_id
        try:
            frames = extract_frames(video_path, frames_dir, fps=FPS)
        except subprocess.CalledProcessError as e:
            print(f"❌ ffmpeg failed: {e}")
            return jsonify({"error": f"ffmpeg failed: {e}"}), 500

        if not frames:
            return jsonify({"error": "No frames extracted from video"}), 500

        # Sample up to MAX_FRAMES_TO_ANALYZE evenly across the video
        num_frames_to_use = min(MAX_FRAMES_TO_ANALYZE, len(frames))
        indices = np.linspace(0, len(frames) - 1, num_frames_to_use, dtype=int)
        selected = [(frames[i], i) for i in indices]

        frame_analyses: List[Dict] = []
        for frame_path, frame_idx in selected:
            timestamp_sec = frame_idx / float(FPS)
            try:
                analysis = analyze_frame_with_gpt(frame_path, timestamp_sec)
                analysis["frame_file"] = str(frame_path)
                frame_analyses.append(analysis)
            except Exception as e:
                print(f"⚠️ Error analyzing frame {frame_path}: {e}")
                # Continue with other frames
                continue

        if not frame_analyses:
            return jsonify({"error": "Failed to analyze any frames"}), 500

        global_analysis = global_analysis_with_gpt(frame_analyses)

        # Return structured response with metrics and feedback
        payload = {
            "job_id": job_id,
            "video_filename": video_path.name,
            "frame_analyses": frame_analyses,
            "final_summary": global_analysis.get("feedback", ""),  # Keep for backward compatibility
            "metrics": {
                "overallScore": global_analysis.get("overallScore", 0),
                "accuracy": global_analysis.get("accuracy", 0),
                "stability": global_analysis.get("stability", 0),
                "toolUsage": global_analysis.get("toolUsage", 0),
                "completionTime": global_analysis.get("completionTime", "N/A"),
            },
            "feedback": global_analysis.get("feedback", ""),
        }
        return jsonify(payload)
    
    except Exception as e:
        print(f"❌ Unexpected error in /upload: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    
    finally:
        # Cleanup temporary files after processing
        try:
            if video_path and video_path.exists():
                video_path.unlink()
                print(f"🧹 Cleaned up video: {video_path}")
            if frames_dir and frames_dir.exists():
                shutil.rmtree(frames_dir, ignore_errors=True)
                print(f"🧹 Cleaned up frames: {frames_dir}")
        except Exception as e:
            print(f"⚠️ Warning: Error cleaning up files: {e}")


if __name__ == "__main__":
    # Flask dev server - using port 5002 to avoid conflicts with system processes
    port = int(os.environ.get("PORT", 5002))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
