import VideoUploadZone from "../VideoUploadZone";

export default function VideoUploadZoneExample() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <VideoUploadZone
        onFileSelect={(file) => console.log("File selected:", file.name)}
        maxSizeMB={250}
      />
    </div>
  );
}
