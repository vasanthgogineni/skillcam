import VideoMetadataForm from "../VideoMetadataForm";

export default function VideoMetadataFormExample() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <VideoMetadataForm
        onSubmit={(metadata) => console.log("Submitted:", metadata)}
        onCancel={() => console.log("Cancelled")}
      />
    </div>
  );
}
