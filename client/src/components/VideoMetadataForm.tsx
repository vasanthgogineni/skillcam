import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface VideoMetadata {
  taskName: string;
  toolType: string;
  difficulty: string;
  notes: string;
}

interface VideoMetadataFormProps {
  onSubmit?: (metadata: VideoMetadata) => void;
  onCancel?: () => void;
}

export default function VideoMetadataForm({
  onSubmit,
  onCancel,
}: VideoMetadataFormProps) {
  const [formData, setFormData] = useState<VideoMetadata>({
    taskName: "",
    toolType: "",
    difficulty: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onSubmit?.(formData);
  };

  const isValid = formData.taskName && formData.toolType && formData.difficulty;

  return (
    <Card className="p-6" data-testid="form-video-metadata">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-heading font-semibold mb-4">
            Task Information
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Provide details about your task to help AI and trainers evaluate your
            performance accurately.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="taskName">Task Name *</Label>
            <Input
              id="taskName"
              placeholder="e.g., CNC Milling - Basic Part Production"
              value={formData.taskName}
              onChange={(e) =>
                setFormData({ ...formData, taskName: e.target.value })
              }
              required
              data-testid="input-task-name"
            />
          </div>

          <div>
            <Label htmlFor="toolType">Tool Type *</Label>
            <Select
              value={formData.toolType}
              onValueChange={(value) =>
                setFormData({ ...formData, toolType: value })
              }
              required
            >
              <SelectTrigger id="toolType" data-testid="select-tool-type">
                <SelectValue placeholder="Select tool type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cnc-machine">CNC Machine</SelectItem>
                <SelectItem value="welding-torch">Welding Torch</SelectItem>
                <SelectItem value="electrical-tools">Electrical Tools</SelectItem>
                <SelectItem value="lathe">Lathe</SelectItem>
                <SelectItem value="drill-press">Drill Press</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty Level *</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) =>
                setFormData({ ...formData, difficulty: value })
              }
              required
            >
              <SelectTrigger id="difficulty" data-testid="select-difficulty">
                <SelectValue placeholder="Select difficulty level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any context that might help evaluators understand your approach..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={4}
              data-testid="textarea-notes"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={!isValid}
            className="flex-1"
            data-testid="button-submit-metadata"
          >
            Submit for Evaluation
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
