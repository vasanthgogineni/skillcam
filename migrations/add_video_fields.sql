-- Migration: Add video fields to submissions table
-- Run this SQL in your Supabase SQL editor or database client

-- Add video_path column if it doesn't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS video_path TEXT;

-- Add video_size column if it doesn't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS video_size INTEGER;

-- Add video_mime_type column if it doesn't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS video_mime_type TEXT;

-- Add video_duration column if it doesn't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS video_duration INTEGER;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND column_name IN ('video_path', 'video_size', 'video_mime_type', 'video_duration');

