import MetricCard from "../MetricCard";
import { Target, Clock, CheckCircle } from "lucide-react";

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8">
      <MetricCard
        label="Accuracy"
        value={85}
        maxValue={100}
        trend={5}
        icon={<Target className="h-5 w-5 text-primary" />}
      />
      <MetricCard
        label="Completion Time"
        value="4:23"
        icon={<Clock className="h-5 w-5 text-primary" />}
      />
      <MetricCard
        label="Tasks Completed"
        value={12}
        trend={15}
        icon={<CheckCircle className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}
