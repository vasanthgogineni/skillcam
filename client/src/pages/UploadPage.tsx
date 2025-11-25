import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import VideoUploadZone from "@/components/VideoUploadZone";
import VideoMetadataForm from "@/components/VideoMetadataForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { uploadSubmissionVideo, getVideoDuration } from "@/lib/fileUpload";

interface UploadPageProps {
  userName?: string;
  userId?: string;
  onLogout?: () => void;
}

export default function UploadPage({
  userName = "Sarah Johnson",
  userId,
  onLogout,
}: UploadPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(false);
  const [step, setStep] = useState<"upload" | "metadata" | "success">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const createSubmissionMutation = useMutation({
    mutationFn: async (data: {
      taskName: string;
      toolType: string;
      difficulty: string;
      notes?: string;
      videoPath: string;
      videoSize: number;
      videoMimeType: string;
      videoDuration?: number;
    }) => {
      const response = await apiRequest("POST", "/api/submissions", {
        taskName: data.taskName,
        toolType: data.toolType,
        difficulty: data.difficulty,
        notes: data.notes || "",
        videoUrl: "", // Deprecated
        videoPath: data.videoPath,
        videoSize: data.videoSize,
        videoMimeType: data.videoMimeType,
        videoDuration: data.videoDuration,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Upload successful!",
        description: "Your video has been submitted for AI evaluation.",
      });
      setStep("success");
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to submit video",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload the file to Supabase Storage
      const result = await uploadSubmissionVideo(file, (progress) => {
        setUploadProgress(progress.percentage);
      });

      console.log("Upload result:", result);
      console.log("Upload path:", result.path);
      
      if (!result.path) {
        throw new Error("Upload failed: No path returned");
      }

      setUploadedFilePath(result.path);
      setIsUploading(false);

      // Move to metadata step
      setTimeout(() => {
        setStep("metadata");
      }, 500);
    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
      // Reset on error
      setUploadedFile(null);
      setUploadProgress(0);
    }
  };

  const handleMetadataSubmit = async (metadata: { taskName: string; toolType: string; difficulty: string; notes: string }) => {
    if (!uploadedFile || !uploadedFilePath) {
      toast({
        title: "Error",
        description: "No video file uploaded",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get video duration
      const duration = await getVideoDuration(uploadedFile);

      console.log("Creating submission with data:", {
        ...metadata,
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
        videoDuration: duration,
      });

      createSubmissionMutation.mutate({
        ...metadata,
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
        videoDuration: duration,
      });
    } catch (error) {
      // If duration extraction fails, submit without it
      createSubmissionMutation.mutate({
        ...metadata,
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
      });
    }
  };

  const handleNewUpload = () => {
    setUploadedFile(null);
    setUploadedFilePath("");
    setUploadProgress(0);
    setIsUploading(false);
    setStep("upload");
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background">
        <Header
          userName={userName}
          userRole="trainee"
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
          onLogout={onLogout}
        />

        <main className="max-w-4xl mx-auto px-6 py-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold mb-2">
              Upload Task Video
            </h1>
            <p className="text-muted-foreground">
              Record and upload your practical task for AI evaluation and trainer
              feedback
            </p>
          </div>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  step === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/20 text-primary"
                }`}
              >
                1
              </div>
              <div className="h-0.5 w-16 bg-border" />
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  step === "metadata" || step === "success"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <div className="h-0.5 w-16 bg-border" />
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  step === "success"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
            </div>
          </div>

          {step === "upload" && (
            <VideoUploadZone
              onFileSelect={handleFileSelect}
              maxSizeMB={250}
            />
          )}

          {step === "metadata" && (
            <VideoMetadataForm
              onSubmit={handleMetadataSubmit}
              onCancel={handleNewUpload}
            />
          )}

          {step === "success" && (
            <Card className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-2">
                Upload Successful!
              </h2>
              <p className="text-muted-foreground mb-6">
                Your video is being processed. AI evaluation will be ready within 2
                minutes.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setLocation("/dashboard")}
                  data-testid="button-view-feedback"
                >
                  View Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNewUpload}
                  data-testid="button-upload-another"
                >
                  Upload Another
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
