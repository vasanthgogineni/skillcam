import UploadPage from "../UploadPage";

export default function UploadPageExample() {
  return (
    <UploadPage
      userName="Sarah Johnson"
      onBack={() => console.log("Back to dashboard")}
      onComplete={() => console.log("View feedback")}
    />
  );
}
