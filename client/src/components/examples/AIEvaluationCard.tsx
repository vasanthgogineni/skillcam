import AIEvaluationCard from "../AIEvaluationCard";

export default function AIEvaluationCardExample() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <AIEvaluationCard
        accuracy={85}
        stability={78}
        completionTime="4:23"
        overallScore={82}
        feedback="Good hand stability and tool control observed. Consider improving speed while maintaining precision. Safety protocols were followed correctly."
      />
    </div>
  );
}
