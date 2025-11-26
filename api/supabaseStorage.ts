import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

console.log("=== Supabase Storage Initialization ===");
console.log("SUPABASE_URL:", supabaseUrl);
console.log("Service Key present:", !!supabaseServiceKey);
console.log("Service Key length:", supabaseServiceKey?.length);
console.log("Using SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface UploadResult {
  path: string;
  publicUrl?: string;
  error?: string;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  duration?: number; // For videos
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The bucket name (e.g., 'submission-videos')
 * @param file - The file buffer or blob
 * @param fileName - The name of the file
 * @param userId - The user ID for folder organization
 * @param isPublic - Whether the file should be publicly accessible
 * @param contentType - The MIME type of the file (e.g., 'video/quicktime', 'image/jpeg')
 */
export async function uploadFile(
  bucket: string,
  file: Buffer | Blob,
  fileName: string,
  userId: string,
  isPublic: boolean = false,
  contentType?: string
): Promise<UploadResult> {
  try {
    console.log("=== uploadFile called ===");
    console.log("Bucket:", bucket);
    console.log("File name:", fileName);
    console.log("User ID:", userId);
    console.log("File type:", typeof file);
    console.log("File is Buffer:", Buffer.isBuffer(file));
    console.log("File size:", file instanceof Buffer ? file.length : (file as any).size);
    console.log("Content type:", contentType);

    // Create a unique path: userId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${timestamp}-${sanitizedFileName}`;

    console.log("Upload path:", filePath);
    console.log("Calling Supabase Storage...");

    // Upload to Supabase Storage
    const uploadOptions: any = {
      cacheControl: "3600",
      upsert: false,
    };

    // Add contentType if provided
    if (contentType) {
      uploadOptions.contentType = contentType;
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, uploadOptions);

    console.log("Supabase response - data:", data);
    console.log("Supabase response - error:", error);

    if (error) {
      console.error("Supabase upload error:", error);
      return { path: "", error: error.message };
    }

    // Get public URL if needed
    let publicUrl: string | undefined;
    if (isPublic) {
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);
      publicUrl = urlData.publicUrl;
    }

    return {
      path: data.path,
      publicUrl,
    };
  } catch (error: any) {
    console.error("=== Upload file exception ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return { path: "", error: error.message };
  }
}

/**
 * Get a signed URL for private file access
 * @param bucket - The bucket name
 * @param path - The file path in the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string; error?: string }> {
  try {
    console.log("=== getSignedUrl called ===");
    console.log("Bucket:", bucket);
    console.log("Path:", path);
    console.log("Expires in:", expiresIn, "seconds");

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    console.log("Supabase createSignedUrl response - data:", data);
    console.log("Supabase createSignedUrl response - error:", error);

    if (error) {
      console.error("Get signed URL error:", error);
      return { url: "", error: error.message };
    }

    if (!data || !data.signedUrl) {
      console.error("No signed URL in response data");
      return { url: "", error: "No signed URL returned from Supabase" };
    }

    console.log("Signed URL generated:", data.signedUrl);
    return { url: data.signedUrl };
  } catch (error: any) {
    console.error("=== getSignedUrl exception ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return { url: "", error: error.message };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The bucket name
 * @param path - The file path to delete
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Delete file error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Delete file error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param bucket - The bucket name
 * @param paths - Array of file paths to delete
 */
export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);

    if (error) {
      console.error("Delete files error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Delete files error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * List files in a user's folder
 * @param bucket - The bucket name
 * @param userId - The user ID
 */
export async function listUserFiles(
  bucket: string,
  userId: string
): Promise<{ files: any[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(userId);

    if (error) {
      console.error("List files error:", error);
      return { files: [], error: error.message };
    }

    return { files: data || [] };
  } catch (error: any) {
    console.error("List files error:", error);
    return { files: [], error: error.message };
  }
}

/**
 * Get file metadata
 * @param file - The file (in browser: File object, in Node: Buffer with metadata)
 */
export function getFileMetadata(file: any): FileMetadata {
  return {
    size: file.size || file.length || 0,
    mimeType: file.type || "application/octet-stream",
  };
}

// Bucket names as constants
export const BUCKETS = {
  SUBMISSION_VIDEOS: "submission-videos",
  TRAINER_ATTACHMENTS: "trainer-attachments",
  PROFILE_AVATARS: "profile-avatars",
} as const;
