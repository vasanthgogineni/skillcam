import { Card } from "@/components/ui/card";
import ScoreBadge from "./ScoreBadge";
import StatusPill from "./StatusPill";
import { FileVideo, Calendar, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionCardProps {
  id: string;
  taskName: string;
  toolType: string;
  date: string;
  score?: number;
  status: "pending" | "ai-evaluated" | "trainer-reviewed" | "approved" | "needs-revision";
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

export default function SubmissionCard({
  id,
  taskName,
  toolType,
  date,
  score,
  status,
  onClick,
  isSelected,
  className,
}: SubmissionCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-colors hover-elevate",
        isSelected && "ring-2 ring-primary",
        className
      )}
      onClick={onClick}
      data-testid={`card-submission-${id}`}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileVideo className="h-6 w-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium truncate">{taskName}</h4>
            {score !== undefined && <ScoreBadge score={score} size="sm" showLabel={false} />}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              <span className="truncate">{toolType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </div>
          </div>

          <StatusPill status={status} />
        </div>
      </div>
    </Card>
  );
}
