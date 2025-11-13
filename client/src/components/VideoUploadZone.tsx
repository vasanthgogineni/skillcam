import { useState, useRef } from "react";
import { Upload, X, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploadZoneProps {
  onFileSelect?: (file: File) => void;
  maxSizeMB?: number;
  className?: string;
}

export default function VideoUploadZone({
  onFileSelect,
  maxSizeMB = 250,
  className,
}: VideoUploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be under ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    onFileSelect?.(file);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover-elevate"
          )}
          data-testid="dropzone-video-upload"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            data-testid="input-video-file"
          />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Upload Your Task Video</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your video here, or click to browse
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-browse-files"
          >
            Browse Files
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supports MP4, MOV, AVI (max {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-6" data-testid="card-upload-progress">
          <div className="flex items-start gap-4">
            <FileVideo className="h-10 w-10 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  data-testid="button-remove-video"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {uploadProgress < 100 ? (
                <>
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Upload complete!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
