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

// ⭐ ADD THIS — for calling Flask AI backend
async function runAiAnalysis(file: File) {
  const form = new FormData();
  form.append("video", file);

  const res = await fetch("http://localhost:5000/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("AI analysis failed");
  return await res.json();
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

  // ⭐ NEW: store AI job ID
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);


  // -------------------------
  // SUBMISSION DB MUTATION
  // -------------------------
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
        description: error?.message || "Failed to submit video",
        variant: "destructive",
      });
    },
  });



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

      // 2️⃣ Move to metadata step (your existing UI)
      setTimeout(() => {
        setStep("metadata");
      }, 300);


      // 3️⃣ ⭐ ALSO kick off AI analysis in the background
      (async () => {
        try {
          const aiJson = await runAiAnalysis(file);

          // Store JSON so the result page can load it
          sessionStorage.setItem(
            `analysis_${aiJson.job_id}`,
            JSON.stringify(aiJson)
          );

          setAnalysisJobId(aiJson.job_id);
        } catch (err: any) {
          console.error("AI error:", err);
          toast({
            title: "AI analysis failed",
            description: err.message,
            variant: "destructive",
          });
        }
      })();

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
  const handleMetadataSubmit = async (metadata) => {
    if (!uploadedFile || !uploadedFilePath) {
      toast({
        title: "Error",
        description: "No video file uploaded",
        variant: "destructive",
      });
      return;
    }

    try {
      const duration = await getVideoDuration(uploadedFile);

      createSubmissionMutation.mutate({
        ...metadata,
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
        videoDuration: duration,
      });
    } catch {
      createSubmissionMutation.mutate({
        ...metadata,
        videoPath: uploadedFilePath,
        videoSize: uploadedFile.size,
        videoMimeType: uploadedFile.type,
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
            <VideoUploadZone onFileSelect={handleFileSelect} maxSizeMB={250} />
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

                {/* ⭐ Show the AI button only when jobId is ready */}
                {analysisJobId && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLocation(`/video-analysis?job_id=${analysisJobId}`)
                    }
                  >
                    View AI Analysis
                  </Button>
                )}
              </div>
            </Card>
          )}

        </main>
      </div>
    </div>
  );
}
