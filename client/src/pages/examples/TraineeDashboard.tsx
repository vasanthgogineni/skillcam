import TraineeDashboard from "../TraineeDashboard";

export default function TraineeDashboardExample() {
  return (
    <TraineeDashboard
      userName="Sarah Johnson"
      onNavigateToUpload={() => console.log("Navigate to upload")}
      onViewSubmission={(id) => console.log("View submission:", id)}
    />
  );
}
