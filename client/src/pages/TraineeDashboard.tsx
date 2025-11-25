import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Clock, CheckCircle, BarChart3, Wrench, Calendar, Loader2, ArrowRight, Sparkles } from "lucide-react";
import type { Submission } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface TraineeDashboardProps {
  userName?: string;
  userId?: string;
  onLogout?: () => void;
}

export default function TraineeDashboard({
  userName = "User",
  userId,
  onLogout,
}: TraineeDashboardProps) {
  const [, setLocation] = useLocation();

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
  });

  // Calculate stats from real submissions
  const totalUploads = submissions.length;
  const pendingReview = submissions.filter(s => s.status === "pending" || s.status === "ai-evaluated").length;
  const completed = submissions.filter(s => s.status === "approved" || s.status === "trainer-reviewed").length;
  
  const stats = [
    {
      label: "Total Uploads",
      value: String(totalUploads),
      icon: <Upload className="h-5 w-5 text-primary" />,
    },
    {
      label: "Average Score",
      value: "N/A",
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
    },
    {
      label: "Pending Review",
      value: String(pendingReview),
      icon: <Clock className="h-5 w-5 text-yellow-600" />,
    },
    {
      label: "Completed",
      value: String(completed),
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    },
  ];

  const actionCards = [
    {
      title: "Upload New Task",
      description: "Record and submit your practical work",
      icon: <Upload className="h-6 w-6 text-primary" />,
      onClick: () => setLocation("/upload"),
      testId: "card-upload-new",
    },
    {
      title: "View Progress Report",
      description: "Analyze your performance trends",
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      onClick: () => console.log("View progress"),
      testId: "card-view-progress",
    },
  ];

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
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Welcome back</span>
            </div>
            <h1 className="text-3xl font-heading font-bold mb-2">
              Hello, {userName}!
            </h1>
            <p className="text-muted-foreground">
              Track your progress, upload new tasks, and get AI-powered feedback on your skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="p-6"
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  {stat.icon}
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {actionCards.map((card) => (
              <Card
                key={card.title}
                className="group hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
                onClick={card.onClick}
                data-testid={card.testId}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold mb-1">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold">Recent Submissions</h2>
            <Button variant="outline" size="sm" data-testid="button-view-all">
              View All
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <Card className="p-12 text-center">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by uploading your first task video
              </p>
              <Button onClick={() => setLocation("/upload")} data-testid="button-upload-first">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Task
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {submissions.slice(0, 5).map((submission) => {
                const statusDisplay = getStatusDisplay(submission.status);
                return (
                  <Card
                    key={submission.id}
                    className="p-6 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/feedback/${submission.id}`)}
                    data-testid={`card-submission-${submission.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-heading font-semibold text-lg">
                            {submission.taskName}
                          </h3>
                          <Badge className={statusDisplay.color}>
                            {statusDisplay.text}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            <span>{submission.toolType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span>{submission.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {submission.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {submission.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">AI Score</p>
                        <p className="text-2xl font-bold text-primary">
                          {(submission as any).aiScore !== null && (submission as any).aiScore !== undefined
                            ? (submission as any).aiScore
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
    </div>
  );
}
