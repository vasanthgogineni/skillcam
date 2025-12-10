# Technical Architecture & Implementation

## Tech Stack (with rationale)
- **Frontend:** React + Vite + TypeScript, Tailwind/UI components — fast dev/build, type safety, theming.
- **Auth & Storage:** Supabase Auth/Storage — managed JWT auth, object storage, easy client/server SDKs.
- **APIs (JS):** Express deployed as serverless functions on Netlify/Vercel (`api/index.ts`) — simple routing, serverless-friendly.
- **APIs (Python AI):** Flask + OpenAI SDK + ffmpeg (Docker/Railway) — isolates video processing/AI workload from JS runtime.
- **DB:** Postgres (Supabase) with Drizzle ORM — typed schema, migrations, RLS-capable DB.
- **Build/Tooling:** tsx/esbuild for server, Recharts for charts, serverless-http wrapper for Express.

## System Architecture
- **Client (Netlify):** React SPA calls `/api/*` (Netlify functions). Direct uploads go to Supabase Storage via signed URLs.
- **JS Serverless (Netlify/Vercel):** Express routes handle CRUD, signed upload URLs, submission creation, and trigger the AI service. Reads/writes Postgres via Drizzle.
- **AI Service (Railway):** Flask app pulls videos from Supabase Storage, runs ffmpeg frame extraction, calls OpenAI vision + summary, returns metrics/feedback. Results are written back via JS API.
- **Data:** Postgres in Supabase (users, submissions, ai_evaluations, trainer_feedback, waitlist_entries). Storage buckets for videos/attachments/avatars.

### High-Level Diagram (textual)
```
Browser (React SPA)
   ↕ HTTPS
Netlify Functions (Express) -----> Supabase Postgres (Drizzle ORM)
   ↕ signed URLs                  Supabase Storage (video/files)
   ↘ trigger
      Flask AI Service (Railway, ffmpeg + OpenAI)
```

### Component Descriptions
- **React SPA:** Uploads videos (direct to Supabase via signed URL), submits metadata, shows dashboards (trainee/trainer), renders AI/trainer feedback, progress charts.
- **Express API (serverless):** Auth via Supabase JWT, issues signed upload URLs, persists submissions/evals/feedback, triggers AI, serves signed download URLs.
- **Flask AI:** Downloads video from Supabase, extracts frames, calls OpenAI with backoff, returns structured metrics/feedback.
- **Supabase Postgres:** Source of truth for users, submissions, AI evals, trainer feedback, waitlist. Indexed for common filters.
- **Supabase Storage:** Buckets: `submission-videos`, `trainer-attachments`, `profile-avatars`.

## Database Schema (key entities)
- **users** (id PK uuid, email, display_name, role, created_at).
- **submissions** (id PK uuid, user_id FK→users, task_name, tool_type, difficulty, notes, video_url/video_path, video_size/mime/duration, status, created_at).
  - Indexes: user_id, status, created_at.
- **ai_evaluations** (id PK uuid, submission_id FK→submissions, accuracy, stability, completion_time, tool_usage, overall_score, feedback, analysis_points[], created_at).
  - Index: submission_id.
- **trainer_feedback** (id PK uuid, submission_id FK→submissions, trainer_id FK→users, overall_assessment, trainer_score, next_steps[], attachment_paths/names[], approved, created_at).
  - Indexes: submission_id, trainer_id.
- **waitlist_entries** (id PK uuid, email unique, org, role_focus, created_at).

## Technical Decisions, Tradeoffs, Constraints
- **Serverless Express vs. dedicated server:** Chose serverless for low ops and tight Netlify/Vercel integration. Tradeoff: cold starts/timeouts (mitigated retries, shorter AI trigger path).
- **Direct-to-Supabase uploads:** Avoids Netlify function body limits; uses signed URLs. Tradeoff: client-side upload complexity; addressed with helper and progress UI.
- **AI isolation in Flask (Railway):** Keeps heavy ffmpeg/OpenAI work out of JS runtime; easier to tune independently. Tradeoff: cross-service coordination; handled by trigger endpoint and retries.
- **Supabase as auth/storage/DB:** Unified auth + storage + Postgres with typed Drizzle schema. Tradeoff: reliance on Supabase availability and correct service-role keys.
- **OpenAI rate limits:** Implemented backoff and reduced FPS/frame count to lower TPM. Tradeoff: fewer frames analyzed per video.
- **Data model:** Separate `ai_evaluations` and `trainer_feedback` linked to submissions to avoid overloading the submission row; indexed for trainer dashboards.
- **RLS vs. service role:** Backend uses service role/privileged DB connection to avoid RLS blocking serverless reads/writes. Tradeoff: ensure env vars are secured.

## AI Usage Throughout the Process
- **How AI was used:** Coding assistance (prompting for edits/refactors), UX copy/wording suggestions, and generating AI feedback on video frames via OpenAI vision/text models. No synthetic user data was generated.
- **Pros:** Faster iteration on boilerplate/UI, consistent structured prompts for frame analysis, quick refactors. AI vision simplifies frame-by-frame descriptive analysis.
- **Cons/limitations:** OpenAI rate limits required backoff and reduced FPS; model can hallucinate or give generic safety notes (prompt tuned to suppress goggles mentions). Requires careful prompt and output validation.
- **Safeguards/validation:** Added JSON-only response instructions, retries with backoff, clamped scores, limited frames, and parsed/validated AI outputs before saving. Manual review via trainer dashboard remains the primary validation for end users.

## Security, Privacy, and Ethical Considerations
- **Security measures:** Supabase Auth JWT for API access; service role keys only on server-side; signed URLs for uploads/downloads; serverless functions do auth checks; SSL enforced on DB connections; storage paths namespaced by user.
- **Privacy:** Only minimal PII stored (email/display name). Videos stored in private buckets unless explicitly made public; signed URLs used for access. No unnecessary logging of payloads; tokens handled server-side.
- **Ethical considerations:** AI feedback is advisory and paired with human trainer review. Prompts tuned to focus on technique/safety and avoid irrelevant safety warnings (e.g., goggles). Users can see trainer feedback alongside AI output.
- **Compliance & accessibility:** Not targeting regulated domains (HIPAA/FERPA). Frontend uses semantic components and follows WCAG-friendly patterns (contrast, focusable buttons). If handling EU users, enable Supabase GDPR tools (data export/delete) and surface a privacy policy.

## Testing & Evaluation
- **Testing strategy:** Manual end-to-end smoke tests across upload → submission → AI trigger → dashboard; API sanity checks (`/api/submissions`, `/api/users/me`); visual inspection of trainer/trainee dashboards; functional checks of report download and progress chart. No automated unit/integration test suite is currently maintained.
- **Results:** Core flows verified manually after recent fixes (uploads via signed URLs, submission creation, AI trigger dispatch, trainer review interactions, progress chart rendering). Performance-sensitive paths (DB connect timeouts) hardened via config tweaks; AI 429s mitigated via backoff and lower FPS/frame count.
- **Known issues:** Reliance on external services (Supabase, OpenAI, Railway) can still cause occasional timeouts; no automated regression tests; progress chart depends on fetching all submission details per task (may need pagination if data grows); trainer dashboard still subject to cold-start delays if serverless functions are idle.
