import { apiRequest, getAuthHeaders } from "./queryClient";
import { supabase } from "./supabase";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  path: string;
  size: number;
  mimeType: string;
  publicUrl?: string;
  originalName: string;
}

/**
 * Upload a file to the server with progress tracking
 * @param file - The file to upload
 * @param endpoint - The API endpoint (e.g., '/api/uploads/submission-video')
 * @param fieldName - The form field name (e.g., 'video', 'attachment', 'avatar')
 * @param onProgress - Optional callback for upload progress
 */
export async function uploadFile(
  file: File,
  endpoint: string,
  fieldName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Get auth headers first
  const authHeaders = await getAuthHeaders();

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          console.error("Server response:", xhr.responseText);
          reject(new Error(`Failed to parse server response: ${xhr.responseText.substring(0, 200)}`));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || "Upload failed"));
        } catch {
          console.error("Server error response:", xhr.responseText);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    // Set up request
    xhr.open("POST", endpoint);

    // Set auth header from Supabase session
    if (authHeaders.Authorization) {
      xhr.setRequestHeader("Authorization", authHeaders.Authorization);
    }

    // Send request
    xhr.send(formData);
  });
}

/**
 * Upload a submission video
 */
export async function uploadSubmissionVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Request a signed upload URL from the API (small JSON payload)
  const signResponse = await apiRequest("POST", "/api/uploads/submission-video-url", {
    fileName: file.name,
    mimeType: file.type,
  });

  const signData = await signResponse.json();
  if (!signResponse.ok) {
    throw new Error(signData?.error || "Failed to get upload URL");
  }

  const { path, signedUrl, token } = signData;
  if (!path || !signedUrl) {
    throw new Error("Upload failed: missing signed upload URL");
  }

  // Upload directly to Supabase Storage using the signed URL (avoids large bodies hitting Netlify)
  const putRes = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(text || `Upload failed with status ${putRes.status}`);
  }

  // Report completion progress
  if (onProgress) {
    onProgress({ loaded: file.size, total: file.size, percentage: 100 });
  }

  return {
    path,
    size: file.size,
    mimeType: file.type,
    originalName: file.name,
  };
}

/**
 * Upload a trainer attachment
 */
export async function uploadTrainerAttachment(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadFile(file, "/api/uploads/trainer-attachment", "attachment", onProgress);
}

/**
 * Upload a profile avatar
 */
export async function uploadProfileAvatar(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadFile(file, "/api/uploads/profile-avatar", "avatar", onProgress);
}

/**
 * Get a signed URL for viewing a private file
 */
export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const response = await apiRequest(
    "GET",
    `/api/uploads/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
  );
  const data = await response.json();
  return data.url;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  await apiRequest("DELETE", `/api/uploads/${bucket}/${path}`);
}

/**
 * Get video duration from a video file
 */
export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };

    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
    };

    video.src = URL.createObjectURL(file);
  });
}
