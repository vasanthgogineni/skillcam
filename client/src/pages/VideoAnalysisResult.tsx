import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface AnalysisPayload {
  job_id: string;
  video_filename: string;
  frame_analyses: any[];
  final_summary: string;
}

export default function VideoAnalysisResult() {
  const [, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job_id");

    if (!jobId) {
      setError("No job_id provided in the URL.");
      return;
    }

    const raw = sessionStorage.getItem(`analysis_${jobId}`);
    if (!raw) {
      setError(
        "No analysis found for this job. Try re-uploading your video from the Upload page."
      );
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setData(parsed);
    } catch (e) {
      console.error(e);
      setError("Stored analysis data is corrupted or invalid.");
    }
  }, []);

  if (error) {
    return (
      <div className={isDark ? "dark" : ""}>
        <div className="min-h-screen bg-background">
          <Header
            userName="Trainee"
            userRole="trainee"
            isDark={isDark}
            onThemeToggle={() => setIsDark(!isDark)}
          />
          <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
            <h1 className="text-3xl font-heading font-bold mb-2">
              AI Analysis Result
            </h1>
            <p className="text-destructive">{error}</p>
            <Button onClick={() => setLocation("/upload")} className="mt-4">
              Go to Upload Page
            </Button>
          </main>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={isDark ? "dark" : ""}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p>Loading analysis…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background">
        <Header
          userName="Trainee"
          userRole="trainee"
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
        />
        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                AI Analysis Result
              </h1>
              <p className="text-muted-foreground">
                Video: <span className="font-mono">{data.video_filename}</span>
              </p>
              <p className="text-muted-foreground">
                Job ID: <span className="font-mono text-xs">{data.job_id}</span>
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Global Summary</h2>
            <pre className="bg-muted p-4 rounded whitespace-pre-wrap text-sm">
              {data.final_summary}
            </pre>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Per-frame Analysis</h2>
            <p className="text-muted-foreground text-sm">
              Raw JSON returned by the AI for each sampled frame.
            </p>
            <pre className="bg-muted p-4 rounded max-h-[400px] overflow-auto text-xs">
              {JSON.stringify(data.frame_analyses, null, 2)}
            </pre>
          </Card>
        </main>
      </div>
    </div>
  );
}
