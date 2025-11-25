import os
import uuid
import base64
import json
import subprocess
from pathlib import Path
from typing import List, Dict

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

# --- config ---
UPLOAD_FOLDER = Path("uploads")
FRAMES_FOLDER = Path("frames")
UPLOAD_FOLDER.mkdir(exist_ok=True)
FRAMES_FOLDER.mkdir(exist_ok=True)

FPS = 1
MAX_FRAMES_TO_ANALYZE = 10

# Models – tweak if you want
VISION_MODEL = "gpt-4o-mini"
SUMMARY_MODEL = "gpt-4o-mini"

# OpenAI client – expects OPENAI_API_KEY in env
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

app = Flask(__name__)
CORS(app)  # allow localhost frontend during dev


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


def analyze_frame_with_gpt(frame_path: Path, timestamp_sec: float) -> Dict:
    """
    Send a single frame to a vision-capable GPT model.
    Ask it to return a JSON blob describing that moment in the video.
    """
    image_url = encode_image_to_data_url(frame_path)

    prompt = f"""
You are analyzing a single frame from a vocational training video.

Return a *JSON object only* with the following keys:

- "timestamp": float, seconds from the start of the video ({timestamp_sec})
- "description": short natural language description of what the trainee is doing
- "errors": list of strings (specific mistakes or technique issues)
- "safety_issues": list of strings (any safety concerns)
- "skill_score": integer between 0 and 100 estimating how well this step is executed

Do not include any explanation outside of JSON.
""".strip()

    resp = client.chat.completions.create(
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


def global_analysis_with_gpt(frame_analyses: List[Dict]) -> str:
    """
    Send all per-frame JSONs to a text model for a global summary.
    Returns markdown-ish feedback.
    """
    system_msg = (
        "You are an expert vocational trainer. "
        "You give precise, structured, and encouraging feedback."
    )

    user_prompt = """
You are given JSON analyses for several frames from a trainee's task video.

Using these, write a concise but detailed report that includes:

1. Overall skill assessment (1–2 sentences).
2. Key strengths (bullet list).
3. Recurring mistakes (bullet list).
4. Safety issues to address (bullet list).
5. 3–5 concrete next steps for practice (numbered list).

Use clear markdown headings and bullets.
""".strip()

    resp = client.chat.completions.create(
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
        max_tokens=800,
    )

    return resp.choices[0].message.content


# ---------- routes ----------


@app.route("/")
def health():
    return jsonify({"status": "ok"})


@app.route("/upload", methods=["POST"])
def upload():
    """
    Accepts a single video file as form-data 'video'.
    - Saves it to uploads/
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

    The React frontend will stash this in sessionStorage and navigate
    to /video-analysis?job_id=...
    """
    if "video" not in request.files:
        return jsonify({"error": "No 'video' file part in request"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    job_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix or ".mp4"
    video_path = UPLOAD_FOLDER / f"{job_id}{ext}"
    file.save(video_path)

    # Extract frames
    frames_dir = FRAMES_FOLDER / job_id
    try:
        frames = extract_frames(video_path, frames_dir, fps=FPS)
    except subprocess.CalledProcessError as e:
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
        analysis = analyze_frame_with_gpt(frame_path, timestamp_sec)
        analysis["frame_file"] = str(frame_path)
        frame_analyses.append(analysis)

    final_summary = global_analysis_with_gpt(frame_analyses)

    # Option A: return everything in one JSON;
    # React will store in sessionStorage and use job_id as the key.
    payload = {
        "job_id": job_id,
        "video_filename": video_path.name,
        "frame_analyses": frame_analyses,
        "final_summary": final_summary,
    }
    return jsonify(payload)


if __name__ == "__main__":
    # Flask dev server
    app.run(host="0.0.0.0", port=5000, debug=True)
