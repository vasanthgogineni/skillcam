import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  videoPath: string | null | undefined;
  bucket?: string;
  className?: string;
}

export default function VideoPlayer({ videoPath, bucket = "submission-videos", className }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Normalize videoPath - handle empty strings and null/undefined
  const normalizedPath = videoPath && videoPath.trim() ? videoPath.trim() : null;

  // Fetch signed URL for the video
  const { data: signedUrlData, isLoading: isLoadingUrl, error: urlError } = useQuery<{ url: string }>({
    queryKey: ["/api/uploads/signed-url", bucket, normalizedPath],
    queryFn: async () => {
      if (!normalizedPath) {
        console.error("VideoPlayer: No video path provided");
        throw new Error("No video path provided");
      }
      
      console.log("VideoPlayer: Fetching signed URL for:", {
        bucket,
        path: normalizedPath,
        encodedPath: encodeURIComponent(normalizedPath)
      });

      const url = `/api/uploads/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(normalizedPath)}`;
      console.log("VideoPlayer: Request URL:", url);

      const response = await apiRequest("GET", url);
      
      console.log("VideoPlayer: Response status:", response.status);
      console.log("VideoPlayer: Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to get signed URL" }));
        console.error("VideoPlayer: Error response:", errorData);
        throw new Error(errorData.error || "Failed to get signed URL");
      }

      const data = await response.json();
      console.log("VideoPlayer: Signed URL received:", data.url ? "Yes" : "No");
      return data;
    },
    enabled: !!normalizedPath,
    retry: 2,
    staleTime: 50 * 60 * 1000, // Cache for 50 minutes (signed URLs are valid for 1 hour)
  });

  useEffect(() => {
    if (signedUrlData?.url) {
      setVideoUrl(signedUrlData.url);
      setIsLoading(false);
      setError(null);
    } else if (urlError) {
      setIsLoading(false);
      const errorMessage = urlError instanceof Error ? urlError.message : "Failed to load video";
      setError(errorMessage);
      console.error("VideoPlayer error:", urlError);
    } else if (!normalizedPath) {
      setIsLoading(false);
      setError("No video available");
    }
  }, [signedUrlData, urlError, normalizedPath]);

  if (!normalizedPath) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No video available</p>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingUrl) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "Failed to load video"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-video bg-black rounded-lg overflow-hidden ${className || ""}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full h-full"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

