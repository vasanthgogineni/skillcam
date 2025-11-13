import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  author: string;
  timestamp?: string;
  content: string;
}

interface TrainerCommentSectionProps {
  comments?: Comment[];
  onAddComment?: (comment: string) => void;
  isTrainer?: boolean;
  className?: string;
}

export default function TrainerCommentSection({
  comments = [],
  onAddComment,
  isTrainer = false,
  className,
}: TrainerCommentSectionProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (newComment.trim()) {
      console.log("Adding comment:", newComment);
      onAddComment?.(newComment);
      setNewComment("");
    }
  };

  return (
    <Card className={cn("p-6", className)} data-testid="section-trainer-comments">
      <h3 className="text-lg font-heading font-semibold mb-4">Trainer Feedback</h3>

      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No trainer feedback yet
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-muted rounded-lg"
              data-testid={`comment-${comment.id}`}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.author}</span>
                  {comment.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {comment.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {isTrainer && (
        <div className="space-y-3">
          <Textarea
            placeholder="Add your feedback for the trainee..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            data-testid="textarea-trainer-comment"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="w-full"
            data-testid="button-add-comment"
          >
            <Send className="h-4 w-4 mr-2" />
            Add Feedback
          </Button>
        </div>
      )}
    </Card>
  );
}
