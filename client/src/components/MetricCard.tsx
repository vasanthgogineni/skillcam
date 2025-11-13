import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  maxValue?: number;
  trend?: number;
  icon?: React.ReactNode;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  maxValue,
  trend,
  icon,
  className,
}: MetricCardProps) {
  const displayValue = typeof value === "number" && maxValue
    ? `${value}/${maxValue}`
    : value;

  const percentage = typeof value === "number" && maxValue
    ? (value / maxValue) * 100
    : null;

  return (
    <Card className={cn("p-4", className)} data-testid={`card-metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-semibold">{displayValue}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      {percentage !== null && (
        <div className="mt-3 w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </Card>
  );
}
