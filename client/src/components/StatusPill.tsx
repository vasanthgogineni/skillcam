import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "pending" | "ai-evaluated" | "trainer-reviewed" | "approved" | "needs-revision";

interface StatusPillProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  "pending": { label: "Pending AI Review", variant: "secondary" },
  "ai-evaluated": { label: "AI Evaluated", variant: "outline" },
  "trainer-reviewed": { label: "Trainer Reviewed", variant: "default" },
  "approved": { label: "Approved", variant: "default" },
  "needs-revision": { label: "Needs Revision", variant: "destructive" },
};

export default function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant={config.variant}
      className={cn("text-xs", className)}
      data-testid={`status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
