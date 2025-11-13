import TrainerCommentSection from "../TrainerCommentSection";

export default function TrainerCommentSectionExample() {
  const mockComments = [
    {
      id: "1",
      author: "Prof. Michael Chen",
      timestamp: "2 hours ago",
      content: "Excellent hand stability and tool control. Your setup was efficient and you followed all safety protocols. For next time, try to improve your speed while maintaining this level of precision.",
    },
    {
      id: "2",
      author: "Dr. Sarah Williams",
      timestamp: "1 day ago",
      content: "Good overall execution. Pay attention to the angle consistency in your welds.",
    },
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <TrainerCommentSection
        comments={mockComments}
        onAddComment={(comment) => console.log("New comment:", comment)}
        isTrainer={true}
      />
    </div>
  );
}
