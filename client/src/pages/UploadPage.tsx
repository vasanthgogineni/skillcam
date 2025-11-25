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

// ⭐ Flask AI Analysis - sends Supabase storage path
async function runAiAnalysis(videoPath: string) {
  const res = await fetch("http://localhost:5002/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ videoPath }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "AI analysis failed");
  }
  return await res.json();
}

// ⭐ Transform Flask AI response to database schema
function transformAiResponseToDbFormat(flaskResponse: any, submissionId: string) {
  const { frame_analyses, final_summary, metrics, feedback } = flaskResponse;

  // Use structured metrics from AI if available, otherwise calculate from frames
  let overallScore = 0;
  let accuracy = 0;
  let stability = 0;
  let toolUsage = 0;
  let completionTime = "N/A";
  let feedbackText = feedback || final_summary || "";

  if (metrics) {
    // Use structured metrics from AI
    overallScore = metrics.overallScore || 0;
    accuracy = metrics.accuracy || 0;
    stability = metrics.stability || 0;
    toolUsage = metrics.toolUsage || 0;
    completionTime = metrics.completionTime || "N/A";
  } else {
    // Fallback: calculate from frame analyses
    const skillScores = frame_analyses.map((f: any) => f.skill_score || 0);
    const avgScore = skillScores.length > 0
      ? Math.round(skillScores.reduce((a: number, b: number) => a + b, 0) / skillScores.length)
      : 0;
    
    overallScore = avgScore;
    accuracy = avgScore;
    stability = avgScore;
    toolUsage = avgScore;
  }

  // Extract analysis points from frame errors and safety issues
  const analysisPoints: string[] = [];
  frame_analyses.forEach((frame: any) => {
    if (frame.errors && frame.errors.length > 0) {
      frame.errors.forEach((err: string) => analysisPoints.push(`Error: ${err}`));
    }
    if (frame.safety_issues && frame.safety_issues.length > 0) {
      frame.safety_issues.forEach((issue: string) => analysisPoints.push(`Safety: ${issue}`));
    }
  });

  return {
    submissionId,
    accuracy: Math.min(100, Math.max(0, accuracy)),
    stability: Math.min(100, Math.max(0, stability)),
    completionTime: completionTime,
    toolUsage: Math.min(100, Math.max(0, toolUsage)),
    overallScore: Math.min(100, Math.max(0, overallScore)),
    feedback: feedbackText,
    analysisPoints: analysisPoints.slice(0, 10), // Limit to top 10
  };
}

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

      // 2️⃣ Move to metadata step
      setTimeout(() => {
        setStep("metadata");
      }, 300);

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
        description: "Running AI analysis...",
      });

      setStep("success");

      // 2️⃣ Run AI analysis in background
      (async () => {
        try {
          console.log("🤖 Starting AI analysis for video:", uploadedFilePath);
          const aiJson = await runAiAnalysis(uploadedFilePath);

          console.log("✅ AI analysis complete:", aiJson);

          // Store in sessionStorage for VideoAnalysisResult page
          sessionStorage.setItem(
            `analysis_${aiJson.job_id}`,
            JSON.stringify(aiJson)
          );
          setAnalysisJobId(aiJson.job_id);

          // 3️⃣ Transform and save to database
          const dbFormat = transformAiResponseToDbFormat(aiJson, submission.id);

          console.log("💾 Saving AI evaluation to database:", dbFormat);
          await apiRequest("POST", "/api/evaluations", dbFormat);

          queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
          queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submission.id}/details`] });

          toast({
            title: "AI Analysis Complete!",
            description: "Your submission has been evaluated by AI.",
          });
        } catch (err: any) {
          console.error("AI analysis error:", err);
          toast({
            title: "AI analysis failed",
            description: err.message || "The submission was saved but AI analysis failed.",
            variant: "destructive",
          });
        }
      })();
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
