// --- your existing imports remain the same ---
import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import VideoUploadZone from "@/components/VideoUploadZone";
import VideoMetadataForm from "@/components/VideoMetadataForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
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

  // ⭐ Store AI job ID for sessionStorage link
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);



  // -------------------------
  // STEP 1 — FILE SELECT
  // -------------------------
  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1️⃣ Upload to Supabase storage
      const result = await uploadSubmissionVideo(file, (progress) => {
        setUploadProgress(progress.percentage);
      });

      if (!result.path) throw new Error("Upload failed: No path returned");

      setUploadedFilePath(result.path);
      setIsUploading(false);

    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
      setUploadedFile(null);
      setUploadProgress(0);
    }
  };



  // -------------------------
  // STEP 2 — METADATA FORM
  // -------------------------
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
      let duration;
      try {
        duration = await getVideoDuration(uploadedFile);
      } catch {
        duration = undefined;
      }

      // 1️⃣ Create submission first
      const submissionResponse = await apiRequest("POST", "/api/submissions", {
        taskName: metadata.taskName,
        toolType: metadata.toolType,
        difficulty: metadata.difficulty,
        notes: metadata.notes || "",
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
        videoDuration: duration,
      });

      const submission = await submissionResponse.json();
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });

      toast({
        title: "Submission created!",
        description: "We'll run AI analysis in the background and update the dashboard.",
      });

      setStep("success");

      // Backend will trigger AI; refresh submissions list
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submission.id}/details`] });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to submit video",
        variant: "destructive",
      });
    }
  };


  // -------------------------
  // RESET
  // -------------------------
  const handleNewUpload = () => {
    setUploadedFile(null);
    setUploadedFilePath("");
    setUploadProgress(0);
    setIsUploading(false);
    setAnalysisJobId(null);
    setStep("upload");
  };



  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background">
        <Header userName={userName} userRole="trainee" onLogout={onLogout} />

        <main className="max-w-4xl mx-auto px-6 py-8">

          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold mb-2">Upload Task Video</h1>
            <p className="text-muted-foreground">
              Record and upload your practical task for AI evaluation and trainer feedback
            </p>
          </div>


          {/* Step indicator unchanged */}


          {step === "upload" && (
            <>
              <VideoUploadZone onFileSelect={handleFileSelect} maxSizeMB={250} />
              {(uploadedFile || uploadedFilePath) && (
                <div className="mt-4 flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Upload status</p>
                      <p className="text-sm text-muted-foreground break-all">
                        {uploadedFilePath
                          ? `Ready for details: ${uploadedFilePath}`
                          : isUploading
                          ? "Uploading to storage…"
                          : "Upload in progress, waiting for path…"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleNewUpload}>Re-upload</Button>
                      <Button
                        onClick={() => setStep("metadata")}
                        disabled={!uploadedFilePath || isUploading}
                      >
                        Continue to details
                      </Button>
                    </div>
                  </div>
                  {!uploadedFilePath && isUploading && (
                    <p className="text-xs text-muted-foreground">
                      If this stays here, refresh and try again. The button will enable once we receive the storage path.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {step === "metadata" && (
            <VideoMetadataForm
              onSubmit={handleMetadataSubmit}
              onCancel={handleNewUpload}
            />
          )}

          {step === "success" && (
            <Card className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-2">
                Upload Successful!
              </h2>
              <p className="text-muted-foreground mb-6">
                Your video is being processed. AI evaluation and trainer feedback will be available.
              </p>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={() => setLocation("/dashboard")}>
                  View Dashboard
                </Button>

                <Button variant="outline" onClick={handleNewUpload}>
                  Upload Another
                </Button>

                <Button variant="outline" onClick={() => setLocation("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </Card>
          )}

        </main>
      </div>
    </div>
  );
}
