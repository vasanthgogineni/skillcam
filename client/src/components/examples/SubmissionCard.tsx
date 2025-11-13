import SubmissionCard from "../SubmissionCard";

export default function SubmissionCardExample() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <SubmissionCard
        id="1"
        taskName="CNC Milling - Basic Part Production"
        toolType="CNC Machine"
        date="Oct 28, 2024"
        score={92}
        status="trainer-reviewed"
        onClick={() => console.log("Clicked submission 1")}
      />
      <SubmissionCard
        id="2"
        taskName="Welding - Corner Joint"
        toolType="Welding Torch"
        date="Oct 27, 2024"
        score={75}
        status="ai-evaluated"
        onClick={() => console.log("Clicked submission 2")}
        isSelected
      />
      <SubmissionCard
        id="3"
        taskName="Electrical Wiring - Panel Assembly"
        toolType="Electrical Tools"
        date="Oct 26, 2024"
        status="pending"
        onClick={() => console.log("Clicked submission 3")}
      />
    </div>
  );
}
