'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Label } from '@/ui/label';

type RejectReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectText: string;
  note: string;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  noteInputId?: string;
};

export function RejectReviewDialog({
  open,
  onOpenChange,
  subjectText,
  note,
  onNoteChange,
  onConfirm,
  isSubmitting = false,
  noteInputId = 'reject-moderation-note',
}: RejectReviewDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reject
            <span className="text-foreground font-semibold"> {subjectText} </span>. Add a moderation
            note before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={noteInputId}>Moderation Note</Label>
          <textarea
            id={noteInputId}
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            rows={3}
            maxLength={500}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Reason for rejection"
            aria-label="Moderation note for rejection"
            disabled={isSubmitting}
          />
          <p className="text-muted-foreground text-xs">{note.length}/500</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            onClick={e => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Rejecting...' : 'Reject'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
