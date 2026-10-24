'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** "Delete this note?" with the consequences spelled out. */
export default function ConfirmDelete({
  title,
  fileCount,
  published,
  busy,
  onCancel,
  onConfirm,
}: {
  /** Title of the note to delete, or null when the window is closed. */
  title: string | null;
  fileCount: number;
  published: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={title !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-2">
          <DialogTitle>Delete this note?</DialogTitle>
          <DialogDescription>
            “{title}” will be removed
            {fileCount > 0
              ? ` together with its ${fileCount === 1 ? 'file' : `${fileCount} files`}`
              : ''}
            {published ? ', and its public page will stop working' : ''}. This cannot be undone.
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
