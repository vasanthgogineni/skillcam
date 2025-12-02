import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Shield,
  TrendingUp,
  Target,
  Lightbulb
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIEvaluation {
  id: string;
  accuracy: number;
  stability: number;
  completionTime: string;
  toolUsage: number;
  overallScore: number;
  feedback: string | null;
  analysisPoints: string[] | null;
  createdAt: string;
}

interface AIAnalysisDisplayProps {
  evaluation: AIEvaluation;
  compact?: boolean;
}

interface ParsedFeedback {
  assessment: string;
  strengths: string[];
  mistakes: string[];
  safetyIssues: string[];
  nextSteps: string[];
}

function parseFeedback(feedback: string): ParsedFeedback {
  const result: ParsedFeedback = {
    assessment: "",
    strengths: [],
    mistakes: [],
    safetyIssues: [],
    nextSteps: [],
  };

  if (!feedback) return result;

  // Split by markdown headings
  const sections = feedback.split(/(?=^#{1,3}\s)/m);

  sections.forEach((section) => {
    const lines = section.trim().split("\n");
    const heading = lines[0]?.toLowerCase() || "";

    if (heading.includes("assessment") || heading.includes("overall")) {
      result.assessment = stripMarkdownAsterisks(lines.slice(1).join("\n").trim());
    } else if (heading.includes("strength")) {
      result.strengths = extractBullets(lines.slice(1).join("\n"));
    } else if (heading.includes("mistake") || heading.includes("error")) {
      result.mistakes = extractBullets(lines.slice(1).join("\n"));
    } else if (heading.includes("safety")) {
      result.safetyIssues = extractBullets(lines.slice(1).join("\n"));
    } else if (heading.includes("next") || heading.includes("practice") || heading.includes("recommendation")) {
      result.nextSteps = extractBullets(lines.slice(1).join("\n"));
    } else if (!heading.startsWith("#") && section.trim()) {
      // If no heading, treat as assessment
      if (!result.assessment) {
        result.assessment = stripMarkdownAsterisks(section.trim());
      }
    }
  });

  return result;
}

function stripMarkdownAsterisks(text: string): string {
  // Remove markdown bold/italic asterisks but preserve the text
  // Replace **text** with text (bold)
  // Replace *text* with text (italic), but be careful with bullet points
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove **bold**
  
  // Remove *italic* but preserve bullet points (lines starting with * followed by space)
  const lines = cleaned.split('\n');
  cleaned = lines.map(line => {
    // If line starts with "* " (bullet point), keep it
    if (line.trim().startsWith('* ')) {
      return line;
    }
    // Otherwise, remove italic asterisks
    return line.replace(/\*([^*\n]+)\*/g, '$1');
  }).join('\n');
  
  return cleaned;
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];
  const lines = text.split("\n");

  lines.forEach((line) => {
    const trimmed = line.trim();
    // Match bullet points (-, *, •, numbers)
    const match = trimmed.match(/^[-*•]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
    if (match) {
      bullets.push(stripMarkdownAsterisks(match[1].trim()));
    } else if (trimmed && !trimmed.startsWith("#")) {
      // If it's not a bullet but has content, add it
      bullets.push(stripMarkdownAsterisks(trimmed));
    }
  });

  return bullets.filter(b => b.length > 0);
}

export default function AIAnalysisDisplay({ evaluation, compact = false }: AIAnalysisDisplayProps) {
  // Strip markdown asterisks from feedback before parsing
  const cleanedFeedback = evaluation.feedback ? stripMarkdownAsterisks(evaluation.feedback) : "";
  const parsed = parseFeedback(cleanedFeedback);

  if (compact) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold">AI Evaluation</h3>
          <Badge variant="outline" className="ml-auto">
            Score: {evaluation.overallScore}/100
          </Badge>
        </div>

        {parsed.assessment && (
          <p className="text-sm text-muted-foreground mb-4">
            {parsed.assessment}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{evaluation.accuracy}%</p>
            <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{evaluation.stability}%</p>
            <p className="text-xs text-muted-foreground mt-1">Stability</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{evaluation.toolUsage}%</p>
            <p className="text-xs text-muted-foreground mt-1">Tool Usage</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">AI Evaluation Complete</h3>
              <p className="text-sm text-muted-foreground">Analyzed with GPT-4 Vision</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">{evaluation.overallScore}</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
          </div>
        </div>

        <Progress value={evaluation.overallScore} className="h-3 mb-4" />

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold mb-1">{evaluation.accuracy}%</div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold mb-1">{evaluation.stability}%</div>
            <div className="text-xs text-muted-foreground">Stability</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold mb-1">{evaluation.toolUsage}%</div>
            <div className="text-xs text-muted-foreground">Tool Usage</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold mb-1">{evaluation.completionTime}</div>
            <div className="text-xs text-muted-foreground">Time</div>
          </div>
        </div>
      </Card>

      {/* Overall Assessment */}
      {parsed.assessment && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Overall Assessment</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {parsed.assessment}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        {parsed.strengths.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">Key Strengths</h4>
            </div>
            <ul className="space-y-3">
              {parsed.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Mistakes/Areas for Improvement */}
        {parsed.mistakes.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold">Areas for Improvement</h4>
            </div>
            <ul className="space-y-3">
              {parsed.mistakes.map((mistake, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{mistake}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Safety Issues (if any) */}
      {parsed.safetyIssues.length > 0 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Safety Concerns Detected</div>
            <ul className="space-y-1 ml-4">
              {parsed.safetyIssues.map((issue, index) => (
                <li key={index} className="text-sm">• {issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Next Steps */}
      {parsed.nextSteps.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Next Steps for Practice</h4>
          </div>
          <ol className="space-y-3">
            {parsed.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                </div>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Analysis Points (from frame analysis) */}
      {evaluation.analysisPoints && evaluation.analysisPoints.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Frame-by-Frame Insights</h4>
            <Badge variant="secondary" className="ml-auto">{evaluation.analysisPoints.length} observations</Badge>
          </div>
          <div className="grid gap-2">
            {evaluation.analysisPoints.slice(0, 10).map((point, index) => {
              // Try to parse JSON if the point looks like JSON from the model
              let parsed: any = null;
              try {
                const trimmed = point.trim();
                if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                  parsed = JSON.parse(trimmed);
                } else if (trimmed.startsWith("```")) {
                  const inner = trimmed.replace(/```json|```/g, "").trim();
                  parsed = JSON.parse(inner);
                }
              } catch (_err) {
                parsed = null;
              }

              if (parsed) {
                return (
                  <div key={index} className="rounded-lg border p-3 bg-muted/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>t={parsed.timestamp ?? "–"}s</span>
                      {typeof parsed.skill_score === "number" && (
                        <span className="font-semibold text-primary">Score: {parsed.skill_score}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1">{parsed.description || "No description"}</p>
                    {(parsed.errors || []).length > 0 && (
                      <ul className="text-sm text-orange-800 dark:text-orange-200 list-disc ml-4 space-y-1">
                        {parsed.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                    {(parsed.safety_issues || []).length > 0 && (
                      <ul className="text-sm text-red-800 dark:text-red-200 list-disc ml-4 space-y-1 mt-1">
                        {parsed.safety_issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }

              // Fallback: plain text pill
              return (
                <div
                  key={index}
                  className={`text-sm p-3 rounded-lg ${
                    point.toLowerCase().includes('error')
                      ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-100'
                      : 'bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100'
                  }`}
                >
                  {stripMarkdownAsterisks(point)}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
