import FeedbackPage from "../FeedbackPage";

export default function FeedbackPageExample() {
  return (
    <FeedbackPage
      userName="Sarah Johnson"
      onBack={() => console.log("Back to dashboard")}
      onDownloadPDF={() => console.log("Download PDF")}
    />
  );
}
