import ScoreBadge from "../ScoreBadge";

export default function ScoreBadgeExample() {
  return (
    <div className="flex gap-8 items-center p-8">
      <ScoreBadge score={92} size="sm" />
      <ScoreBadge score={75} size="md" />
      <ScoreBadge score={48} size="lg" />
    </div>
  );
}
