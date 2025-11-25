# Supabase Storage Setup Guide

## Overview

Your application now has a production-ready file storage system using Supabase Storage. This guide explains the setup and how to use it.

## Storage Buckets Created

### 1. submission-videos
- **Purpose**: Stores trainee video submissions
- **Access**: Private (requires authentication)
- **Size Limit**: 250MB per file
- **Allowed Types**: MP4, MOV, AVI, WebM
- **Path Structure**: `{userId}/{timestamp}-{filename}`

### 2. trainer-attachments
- **Purpose**: Stores trainer feedback attachments (images, PDFs)
- **Access**: Private (trainers can upload, all authenticated users can view)
- **Size Limit**: 10MB per file
- **Allowed Types**: JPEG, PNG, GIF, WebP, PDF
- **Path Structure**: `{trainerId}/{timestamp}-{filename}`

### 3. profile-avatars
- **Purpose**: Stores user profile pictures
- **Access**: Public (anyone can view, only owner can upload/update/delete)
- **Size Limit**: 2MB per file
- **Allowed Types**: JPEG, PNG, WebP
- **Path Structure**: `{userId}/{timestamp}-{filename}`

## Security - Row Level Security (RLS) Policies

All buckets have RLS policies configured:

### submission-videos Policies:
- ✅ Users can upload their own videos
- ✅ Users can view their own videos
- ✅ Trainers can view all videos
- ✅ Users can delete their own videos

### trainer-attachments Policies:
- ✅ Only trainers can upload attachments
- ✅ All authenticated users can view attachments
- ✅ Trainers can delete their own attachments

### profile-avatars Policies:
- ✅ Users can upload/update their own avatar
- ✅ Anyone (public) can view avatars
- ✅ Users can delete their own avatar

## Environment Configuration

### Required Environment Variables

Add to your `.env` file:

```bash
# Existing Supabase Config
SUPABASE_URL=https://yrdmimdkhsdzqjjdajvv.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# NEW: Add Service Role Key for server-side uploads
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### How to Get Your Service Role Key:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yrdmimdkhsdzqjjdajvv/settings/api)
2. Navigate to **Settings** → **API**
3. Copy the `service_role` key (⚠️ Keep this secret! Server-side only)
4. Add it to your `.env` file

**⚠️ IMPORTANT**: Never expose the service role key in client-side code!

## Database Schema Updates

The following columns were added to track file metadata:

### submissions table:
- `video_path` - Storage path (e.g., `user-id/12345-video.mp4`)
- `video_size` - File size in bytes
- `video_mime_type` - MIME type (e.g., `video/mp4`)
- `video_duration` - Video duration in seconds

### trainer_feedback table:
- `attachment_paths` - Array of storage paths for attachments
- `attachment_names` - Array of original filenames

### users table:
- `avatar_url` - Public URL for profile avatar

## API Endpoints

### Upload Endpoints

#### 1. Upload Submission Video
```typescript
POST /api/uploads/submission-video
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- video: File (max 250MB, video/*)

Response:
{
  "path": "user-id/1234-video.mp4",
  "size": 15728640,
  "mimeType": "video/mp4",
  "originalName": "my-video.mp4"
}
```

#### 2. Upload Trainer Attachment
```typescript
POST /api/uploads/trainer-attachment
Content-Type: multipart/form-data
Authorization: Bearer {token}
Required Role: trainer

Form Data:
- attachment: File (max 10MB, image/* or application/pdf)

Response:
{
  "path": "trainer-id/1234-feedback.png",
  "size": 524288,
  "mimeType": "image/png",
  "originalName": "feedback.png"
}
```

#### 3. Upload Profile Avatar
```typescript
POST /api/uploads/profile-avatar
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- avatar: File (max 2MB, image/*)

Response:
{
  "path": "user-id/1234-avatar.jpg",
  "publicUrl": "https://...supabase.co/.../avatar.jpg",
  "size": 102400,
  "mimeType": "image/jpeg"
}
```

### Access Endpoints

#### Get Signed URL (for private files)
```typescript
GET /api/uploads/signed-url?bucket={bucket}&path={path}
Authorization: Bearer {token}

Response:
{
  "url": "https://...signed-url-here..."
}
```

Note: Signed URLs expire after 1 hour by default.

#### Delete File
```typescript
DELETE /api/uploads/{bucket}/{path}
Authorization: Bearer {token}

Response:
{
  "success": true
}
```

## Client-Side Usage

### Upload a Video

```typescript
import { uploadSubmissionVideo } from "@/lib/fileUpload";

const handleUpload = async (file: File) => {
  try {
    const result = await uploadSubmissionVideo(file, (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
    });

    console.log("Video uploaded:", result.path);

    // Save to database
    await createSubmission({
      videoPath: result.path,
      videoSize: result.size,
      videoMimeType: result.mimeType,
      // ... other fields
    });
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

### Get Signed URL for Viewing

```typescript
import { getSignedUrl } from "@/lib/fileUpload";

const videoPath = "user-id/1234-video.mp4";
const url = await getSignedUrl("submission-videos", videoPath);

// Use URL in video player
<video src={url} controls />
```

### Upload Profile Avatar

```typescript
import { uploadProfileAvatar } from "@/lib/fileUpload";

const handleAvatarUpload = async (file: File) => {
  const result = await uploadProfileAvatar(file);

  // result.publicUrl is immediately available (public bucket)
  console.log("Avatar URL:", result.publicUrl);
};
```

## Testing Checklist

- [ ] Upload a video from the upload page
- [ ] Verify video appears in Supabase Storage dashboard
- [ ] Verify submission is created with correct file metadata
- [ ] View the video (signed URL should work)
- [ ] Upload a trainer attachment (as trainer)
- [ ] Upload a profile avatar
- [ ] Delete a file
- [ ] Verify RLS policies (trainee cannot access other trainees' videos)
- [ ] Verify file size limits are enforced
- [ ] Verify MIME type restrictions are enforced

## Monitoring

### Check Storage Usage
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yrdmimdkhsdzqjjdajvv/storage/buckets)
2. View each bucket to see files and storage usage

### Storage Limits
- Free tier: 1GB storage
- Pro tier: 100GB storage
- Enterprise: Custom

## Troubleshooting

### Upload fails with "Access denied"
- Check that user is authenticated
- Verify RLS policies allow the operation
- For trainer attachments, ensure user has trainer role

### Upload fails with "File too large"
- Check file size limits:
  - Videos: 250MB
  - Attachments: 10MB
  - Avatars: 2MB

### Cannot view uploaded video
- Ensure you're using signed URLs for private buckets
- Check that signed URL hasn't expired (1 hour default)
- Verify user has permission to view the file

### "SUPABASE_SERVICE_ROLE_KEY not found"
- Add the service role key to your `.env` file
- Restart your development server
- Never commit this key to version control

## Production Deployment

### Vercel Environment Variables

Add these to your Vercel project settings:

```
SUPABASE_URL=https://yrdmimdkhsdzqjjdajvv.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (⚠️ Keep secret!)
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret
NODE_ENV=production
PORT=5001
```

### CORS Configuration

If you experience CORS issues, update Supabase CORS settings:
1. Go to Storage settings
2. Add your production domain to allowed origins

## Next Steps

1. ✅ Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`
2. ✅ Restart development server
3. ✅ Test video upload flow
4. ✅ Test viewing uploaded videos
5. ✅ Configure production environment variables
6. ✅ Monitor storage usage as users upload files

## Support

For issues:
- Check [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- View storage logs in Supabase Dashboard
- Check browser console for client-side errors
- Check server logs for backend errors
