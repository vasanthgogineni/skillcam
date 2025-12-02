import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Submission } from "@shared/schema";
import { getAuthHeaders } from "@/lib/queryClient";

type ReportRow = {
  id: string;
  taskName: string;
  createdAt: string;
  aiScore: number | null;
  trainerScore: number | null;
};

async function fetchProgressRows(): Promise<ReportRow[]> {
  const headers = await getAuthHeaders();
  const baseOpts = {
    headers,
    credentials: "include" as const,
  };

  const subsRes = await fetch("/api/submissions", baseOpts);
  if (!subsRes.ok) throw new Error("Failed to load submissions");
  const subs: Submission[] = await subsRes.json();

  const rows = await Promise.all(
    subs.map(async (s) => {
      try {
        const detailRes = await fetch(`/api/submissions/${s.id}/details`, baseOpts);
        if (!detailRes.ok) throw new Error("detail fetch failed");
        const detail = await detailRes.json();
        return {
          id: s.id,
          taskName: s.taskName,
          createdAt: s.createdAt,
          aiScore: detail.aiEvaluation?.overallScore ?? s.aiScore ?? null,
          trainerScore: detail.trainerFeedback?.trainerScore ?? null,
        };
      } catch (_err) {
        return {
          id: s.id,
          taskName: s.taskName,
          createdAt: s.createdAt,
          aiScore: (s as any).aiScore ?? null,
          trainerScore: null,
        };
      }
    })
  );

  // Sort by createdAt descending
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function ProgressReport({
  userName = "User",
  onLogout,
}: {
  userName?: string;
  onLogout?: () => void;
}) {
  const [, setLocation] = useLocation();
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["/progress-report"],
    queryFn: fetchProgressRows,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} userRole="trainee" onLogout={onLogout} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-heading font-bold">Progress Report</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <p className="text-destructive">Failed to load progress data.</p>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No submissions yet.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-heading font-semibold">AI vs Trainer Scores</h2>
              <p className="text-sm text-muted-foreground">
                Compare AI evaluation scores with trainer scores across your tasks.
              </p>
            </div>
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="taskName" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aiScore" name="AI Score" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="trainerScore" name="Trainer Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
