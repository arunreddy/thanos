import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FeedbackType, FeedbackCategory } from "@/types";

const NEGATIVE_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "incorrect_information", label: "Incorrect information" },
  { value: "unhelpful_response", label: "Unhelpful response" },
  { value: "wrong_query_suggestion", label: "Wrong query or SQL suggestion" },
  { value: "missing_context", label: "Missing context" },
  { value: "confusing_explanation", label: "Confusing explanation" },
  { value: "incomplete_response", label: "Incomplete response" },
  { value: "other", label: "Other" },
];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackType: FeedbackType;
  onSubmit: (data: {
    feedback_type: FeedbackType;
    category?: FeedbackCategory;
    comment?: string;
  }) => void;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  feedbackType,
  onSubmit,
}: FeedbackDialogProps) {
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [comment, setComment] = useState("");

  const isPositive = feedbackType === "positive";

  const handleSubmit = () => {
    onSubmit({
      feedback_type: feedbackType,
      category: category || undefined,
      comment: comment.trim() || undefined,
    });
    setCategory("");
    setComment("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCategory("");
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Give {isPositive ? "positive" : "negative"} feedback
          </DialogTitle>
          {!isPositive && (
            <DialogDescription>
              What type of issue do you wish to report? (optional)
            </DialogDescription>
          )}
          {isPositive && (
            <DialogDescription>
              Please provide details: (optional)
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {!isPositive && (
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as FeedbackCategory | "")
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select...</option>
              {NEGATIVE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isPositive
                ? "What was satisfying about this response?"
                : "What was unsatisfying about this response?"
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
