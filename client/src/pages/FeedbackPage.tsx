import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Play, Sparkles, User, CheckCircle, Upload, BookOpen, Target, Loader2, Wrench, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import VideoPlayer from "@/components/VideoPlayer";
import AIAnalysisDisplay from "@/components/AIAnalysisDisplay";

interface FeedbackPageProps {
  userName?: string;
  userId?: string;
  onLogout?: () => void;
}

interface SubmissionDetails {
  submission: {
    id: string;
    taskName: string;
    toolType: string;
    difficulty: string;
    notes: string | null;
    videoUrl: string | null;
    videoPath: string | null;
    status: string;
    createdAt: string;
  } | null;
  aiEvaluation: {
    id: string;
    accuracy: number;
    stability: number;
    completionTime: string;
    toolUsage: number;
    overallScore: number;
    feedback: string | null;
    analysisPoints: string[] | null;
    createdAt: string;
  } | null;
  trainerFeedback: {
    id: string;
    overallAssessment: string;
    trainerScore: number | null;
    nextSteps: string[] | null;
    approved: boolean;
    createdAt: string;
  } | null;
}

export default function FeedbackPage({
  userName = "Sarah Johnson",
  userId,
  onLogout,
}: FeedbackPageProps) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/feedback/:id");

  const submissionId = params?.id;

  const { data: details, isLoading } = useQuery<SubmissionDetails>({
    queryKey: [`/api/submissions/${submissionId}/details`],
    enabled: !!submissionId,
  });

  const handleDownload = async () => {
    try {
      if (!details?.submission) return;
      const payload = {
        submission: details.submission,
        aiEvaluation: details.aiEvaluation,
        trainerFeedback: details.trainerFeedback,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = details.submission.taskName || "report";
      a.download = `${name.replace(/\s+/g, "_")}_report.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report", err);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      pending: { text: "Pending", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
      "ai-evaluated": { text: "AI Evaluated", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
      "trainer-reviewed": { text: "Reviewed", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
      approved: { text: "Approved", color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: "text-gray-600 bg-gray-50 dark:bg-gray-950/30" };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={userName}
        userRole="trainee"
        onLogout={onLogout}
      />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="outline" data-testid="button-download-report" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !details?.submission ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Submission not found</p>
              <Button onClick={() => setLocation("/dashboard")} className="mt-4">
                Return to Dashboard
              </Button>
            </Card>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-heading font-bold mb-2">
                  {details.submission.taskName}
                </h1>
                <div className="flex items-center gap-4 mb-2">
                  <Badge className={getStatusDisplay(details.submission.status).color}>
                    {getStatusDisplay(details.submission.status).text}
                  </Badge>
                  {details.trainerFeedback && (
                    <span className="text-sm text-muted-foreground">
                      Reviewed {formatDistanceToNow(new Date(details.trainerFeedback.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span>{details.submission.toolType}</span>
                  </div>
                  <span>•</span>
                  <span>{details.submission.difficulty}</span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted {formatDistanceToNow(new Date(details.submission.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 p-6">
                  <VideoPlayer 
                    videoPath={details.submission.videoPath || details.submission.videoUrl} 
                    bucket="submission-videos"
                    className="mb-4"
                  />
                  {details.submission.notes && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Your Notes</h3>
                      <p className="text-sm text-muted-foreground">{details.submission.notes}</p>
                    </div>
                  )}
                </Card>

                <div className="space-y-4">
                  <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                    {details.trainerFeedback ? (
                      <>
                        <p className="text-5xl font-bold text-green-600 mb-4">{details.trainerFeedback.trainerScore}%</p>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div>
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">AI Score</span>
                            </div>
                            <p className="text-xl font-bold">{details.aiEvaluation?.overallScore || 'N/A'}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <User className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Trainer</span>
                            </div>
                            <p className="text-xl font-bold">{details.trainerFeedback.trainerScore}%</p>
                          </div>
                        </div>
                      </>
                    ) : details.aiEvaluation ? (
                      <>
                        <p className="text-5xl font-bold text-primary mb-4">{details.aiEvaluation.overallScore}</p>
                        <Badge variant="outline">AI Evaluated</Badge>
                        <p className="text-xs text-muted-foreground mt-2">Awaiting trainer review</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground py-8">Awaiting evaluation</p>
                    )}
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Uploaded</span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">AI Evaluation</span>
                        {details.aiEvaluation ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-xs text-yellow-600">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Trainer Review</span>
                        {details.trainerFeedback ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-xs text-yellow-600">Pending</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {details.aiEvaluation && (
                <div className="mb-6">
                  <AIAnalysisDisplay evaluation={details.aiEvaluation} />
                </div>
              )}

              {details.trainerFeedback && (
                <>
                  <Card className="p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-heading font-semibold">Trainer Feedback</h3>
                      {details.trainerFeedback.approved && (
                        <Badge className="text-green-600 bg-green-50 dark:bg-green-950/30">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Overall Assessment</h4>
                        <p className="text-sm text-muted-foreground">
                          {details.trainerFeedback.overallAssessment}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Next Steps</h4>
                        <p className="text-sm text-muted-foreground">
                          {details.trainerFeedback.nextSteps}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-heading font-semibold">Recommended Actions</h3>
                    </div>
                    <div className="space-y-3">
                      <Button
                        onClick={() => setLocation("/upload")}
                        className="w-full justify-start"
                        variant="outline"
                        data-testid="button-upload-new"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Another Task
                      </Button>
                      <Button
                        onClick={() => setLocation("/dashboard")}
                        className="w-full justify-start"
                        variant="outline"
                        data-testid="button-view-dashboard"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        View All Submissions
                      </Button>
                    </div>
                  </Card>
                </>
              )}

              {!details.trainerFeedback && details.submission.status === "pending" && (
                <Card className="p-6">
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="font-heading font-semibold mb-2">Processing Your Submission</h3>
                    <p className="text-sm text-muted-foreground">
                      Your video is being evaluated. This typically takes 2-3 minutes.
                    </p>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
    </div>
  );
}
