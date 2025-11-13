import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import MetricCard from "./MetricCard";

interface AIEvaluationCardProps {
  accuracy: number;
  stability: number;
  completionTime: string;
  overallScore: number;
  feedback?: string;
  className?: string;
}

export default function AIEvaluationCard({
  accuracy,
  stability,
  completionTime,
  overallScore,
  feedback,
  className,
}: AIEvaluationCardProps) {
  return (
    <Card className={className} data-testid="card-ai-evaluation">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-heading font-semibold">AI Evaluation</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Automated analysis completed within 2 minutes of upload
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Accuracy" value={accuracy} maxValue={100} />
          <MetricCard label="Stability" value={stability} maxValue={100} />
          <MetricCard label="Completion Time" value={completionTime} />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-2xl font-bold text-primary">{overallScore}/100</span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>

        {feedback && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2">AI Feedback</h4>
            <p className="text-sm text-muted-foreground">{feedback}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
