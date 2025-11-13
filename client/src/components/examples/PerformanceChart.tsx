import PerformanceChart from "../PerformanceChart";

export default function PerformanceChartExample() {
  const mockData = [
    { date: "Oct 20", score: 72 },
    { date: "Oct 22", score: 78 },
    { date: "Oct 24", score: 75 },
    { date: "Oct 26", score: 82 },
    { date: "Oct 28", score: 85 },
    { date: "Oct 30", score: 88 },
    { date: "Nov 1", score: 92 },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PerformanceChart data={mockData} />
    </div>
  );
}
