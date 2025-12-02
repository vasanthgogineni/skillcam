import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Play, CheckCircle, AlertCircle, Sparkles, Wrench, Calendar, Send, Loader2, User } from "lucide-react";
import type { Submission, AIEvaluation, TrainerFeedback } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import VideoPlayer from "@/components/VideoPlayer";
import AIAnalysisDisplay from "@/components/AIAnalysisDisplay";

type SubmissionDetails = {
  submission: Submission;
  aiEvaluation: AIEvaluation | null;
  trainerFeedback: TrainerFeedback | null;
};

interface TrainerReviewProps {
  userName?: string;
  userId?: string;
  onLogout?: () => void;
}

export default function TrainerReview({
  userName = "Prof. Michael Chen",
  userId,
  onLogout,
}: TrainerReviewProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [trainerFeedback, setTrainerFeedback] = useState("");
  const [trainerScore, setTrainerScore] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const { data: submissions = [], isLoading, error, refetch } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const { data: submissionDetails, isLoading: isLoadingDetails } = useQuery<SubmissionDetails>({
    queryKey: [`/api/submissions/${selectedSubmissionId}/details`],
    enabled: !!selectedSubmissionId,
    staleTime: 0,
    retry: 1,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { submissionId: string; overallAssessment: string; trainerScore: number; nextSteps: string[]; approved: boolean }) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      if (selectedSubmissionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/submissions/${selectedSubmissionId}/details`] });
      }
      toast({
        title: "Feedback submitted",
        description: "Your feedback has been sent to the trainee",
      });
      setTrainerFeedback("");
      setTrainerScore("");
      setNextSteps("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeedback = (approved: boolean) => {
    if (!selectedSubmissionId || !trainerFeedback || !trainerScore || !nextSteps) {
      toast({
        title: "Missing fields",
        description: "Please fill in all feedback fields",
        variant: "destructive",
      });
      return;
    }

    const score = parseInt(trainerScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast({
        title: "Invalid score",
        description: "Score must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    submitFeedbackMutation.mutate({
      submissionId: selectedSubmissionId,
      overallAssessment: trainerFeedback,
      trainerScore: score,
      nextSteps: nextSteps.split('\n').filter(step => step.trim().length > 0),
      approved,
    });
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.toolType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || 
      (filterStatus === "pending" && (sub.status === "pending" || sub.status === "ai-evaluated")) ||
      (filterStatus === "reviewed" && (sub.status === "trainer-reviewed" || sub.status === "approved"));
    return matchesSearch && matchesFilter;
  });

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      pending: { text: "Pending", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
      "ai-evaluated": { text: "AI Evaluated", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
      "trainer-reviewed": { text: "Reviewed", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
      approved: { text: "Approved", color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: "text-gray-600 bg-gray-50 dark:bg-gray-950/30" };
  };

  // Auto-select first submission when data loads or filter changes
  useEffect(() => {
    if (!selectedSubmissionId && filteredSubmissions.length > 0) {
      setSelectedSubmissionId(filteredSubmissions[0].id);
    }
  }, [filteredSubmissions, selectedSubmissionId]);

  const selectedData = submissions.find((s) => s.id === selectedSubmissionId);
  // Try to get videoPath from submissionDetails first (most complete data), then fallback to selectedData
  const videoPath = submissionDetails?.submission?.videoPath 
    || submissionDetails?.submission?.videoUrl 
    || selectedData?.videoPath 
    || selectedData?.videoUrl;
  
  // Debug logging
  useEffect(() => {
    if (selectedSubmissionId) {
      console.log("=== Video Player Debug ===");
      console.log("Selected submission ID:", selectedSubmissionId);
      console.log("Selected data (from list):", selectedData);
      console.log("Submission details (full):", submissionDetails);
      console.log("Final videoPath:", videoPath);
      console.log("Submission videoPath:", submissionDetails?.submission?.videoPath);
      console.log("Submission videoUrl:", submissionDetails?.submission?.videoUrl);
      console.log("SelectedData videoPath:", selectedData?.videoPath);
      console.log("SelectedData videoUrl:", selectedData?.videoUrl);
    }
  }, [selectedSubmissionId, selectedData, submissionDetails, videoPath]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={userName}
        userRole="trainer"
        onLogout={onLogout}
      />

        <main className="flex h-[calc(100vh-4rem)]">
          <aside className="w-80 border-r bg-card/50 overflow-y-auto p-4">
            <div className="mb-6">
              <h2 className="text-lg font-heading font-semibold mb-3">
                Dashboard Overview
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">
                    {submissions.length}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">
                    {submissions.filter(s => s.status === "pending" || s.status === "ai-evaluated").length}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Reviewed</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="stat-reviewed">
                    {submissions.filter(s => s.status === "trainer-reviewed").length}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Approved</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-approved">
                    {submissions.filter(s => s.status === "approved").length}
                  </p>
                </Card>
              </div>
            </div>

            <h2 className="text-lg font-heading font-semibold mb-4">
              Submissions to Review
            </h2>

            {error && (
              <div className="text-sm text-destructive mb-3">
                Failed to load submissions.{" "}
                <button className="underline" onClick={() => refetch()}>Retry</button>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search task or tool..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((submission) => {
                  const statusDisplay = getStatusDisplay(submission.status);
                  return (
                    <Card
                      key={submission.id}
                      className={`p-4 cursor-pointer hover-elevate active-elevate-2 ${
                        selectedSubmissionId === submission.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedSubmissionId(submission.id)}
                      data-testid={`submission-card-${submission.id}`}
                    >
                      <div className="mb-2">
                        <h4 className="font-medium mb-1 line-clamp-1">{submission.taskName}</h4>
                        <p className="text-sm text-muted-foreground">
                          User ID: {submission.userId.slice(0, 8)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {submission.toolType}
                        </span>
                      </div>
                      <Badge className={statusDisplay.color}>
                        {statusDisplay.text}
                      </Badge>
                    </Card>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6">
              {!selectedData ? (
                <div className="text-center py-24">
                  <p className="text-muted-foreground">Select a submission to review</p>
                </div>
              ) : isLoadingDetails ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl font-heading font-bold mb-2">
                      {selectedData.taskName}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>User: {selectedData.userId.slice(0, 8)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        <span>{selectedData.toolType}</span>
                      </div>
                      <span>•</span>
                      <span>{selectedData.difficulty}</span>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(selectedData.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>

                  <Card className="p-6 mb-6">
                    <VideoPlayer 
                      videoPath={videoPath} 
                      bucket="submission-videos"
                      className="mb-4"
                    />
                    {selectedData.notes && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Trainee Notes</h3>
                        <p className="text-sm text-muted-foreground">{selectedData.notes}</p>
                      </div>
                    )}
                  </Card>

                  {submissionDetails?.aiEvaluation ? (
                    <div className="mb-6">
                      <AIAnalysisDisplay evaluation={{
                        ...submissionDetails.aiEvaluation,
                        createdAt: submissionDetails.aiEvaluation.createdAt.toString()
                      }} />
                    </div>
                  ) : (
                    <Card className="p-6 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="font-heading font-semibold">AI Evaluation</h3>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI evaluation will appear here once processing is complete
                      </p>
                    </Card>
                  )}

                  <Card className="p-6">
                    <h3 className="font-heading font-semibold mb-4">Trainer Feedback</h3>
                    
                    {submissionDetails?.trainerFeedback ? (
                      <div className="space-y-4 mb-6 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/30">
                            Already Reviewed
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Trainer Score</p>
                            <p className="text-2xl font-bold text-primary" data-testid="text-trainer-score">
                              {submissionDetails.trainerFeedback.trainerScore}/100
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Overall Assessment</p>
                          <p className="text-sm text-muted-foreground" data-testid="text-trainer-assessment">
                            {submissionDetails.trainerFeedback.overallAssessment}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Next Steps</p>
                          {submissionDetails.trainerFeedback.nextSteps && submissionDetails.trainerFeedback.nextSteps.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground" data-testid="list-trainer-next-steps">
                              {submissionDetails.trainerFeedback.nextSteps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No next steps provided</p>
                          )}
                        </div>
                        
                        {submissionDetails.trainerFeedback.approved && (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span>Approved by trainer</span>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground border-t pt-3 mt-3">
                          You can update your feedback by submitting new feedback below.
                        </p>
                      </div>
                    ) : null}
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Overall Assessment *
                        </label>
                        <Textarea
                          placeholder="Provide comprehensive feedback on the trainee's performance, highlighting strengths and areas for improvement..."
                          value={trainerFeedback}
                          onChange={(e) => setTrainerFeedback(e.target.value)}
                          rows={6}
                          data-testid="textarea-feedback"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Trainer Score (0-100)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="77"
                          value={trainerScore}
                          onChange={(e) => setTrainerScore(e.target.value)}
                          data-testid="input-score"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Next Steps / Recommendations
                          <span className="text-xs text-muted-foreground ml-2 font-normal">(one per line)</span>
                        </label>
                        <Textarea
                          placeholder="Practice with harder materials&#10;Try advanced cutting patterns&#10;Focus on maintaining steady hand movements"
                          value={nextSteps}
                          onChange={(e) => setNextSteps(e.target.value)}
                          rows={3}
                          data-testid="textarea-next-steps"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => handleSubmitFeedback(true)}
                          disabled={submitFeedbackMutation.isPending}
                          data-testid="button-approve"
                          className="flex-1"
                        >
                          {submitFeedbackMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve & Submit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleSubmitFeedback(false)}
                          disabled={submitFeedbackMutation.isPending}
                          data-testid="button-submit-feedback"
                          className="flex-1"
                        >
                          {submitFeedbackMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Submit Feedback
                        </Button>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </main>
    </div>
  );
}
