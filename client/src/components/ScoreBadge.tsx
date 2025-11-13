import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function ScoreBadge({
  score,
  maxScore = 100,
  size = "md",
  showLabel = true,
  className,
}: ScoreBadgeProps) {
  const percentage = (score / maxScore) * 100;
  
  const getScoreColor = () => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";
  };

  const sizeClasses = {
    sm: "h-12 w-12 text-sm",
    md: "h-16 w-16 text-base",
    lg: "h-20 w-20 text-lg",
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center font-semibold",
          getScoreColor(),
          sizeClasses[size]
        )}
        data-testid={`badge-score-${score}`}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">out of {maxScore}</span>
      )}
    </div>
  );
}
