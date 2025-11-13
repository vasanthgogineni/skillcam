import StatusPill from "../StatusPill";

export default function StatusPillExample() {
  return (
    <div className="flex flex-wrap gap-3 p-8">
      <StatusPill status="pending" />
      <StatusPill status="ai-evaluated" />
      <StatusPill status="trainer-reviewed" />
      <StatusPill status="approved" />
      <StatusPill status="needs-revision" />
    </div>
  );
}
