'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'S'], label: 'Save the note' },
  { keys: ['Ctrl', 'Enter'], label: 'Save and close the editor' },
  { keys: ['Ctrl', 'B'], label: 'Bold' },
  { keys: ['Ctrl', 'I'], label: 'Italic' },
  { keys: ['Ctrl', 'K'], label: 'Add a link' },
  { keys: ['Ctrl', 'E'], label: 'Inline code' },
  { keys: ['Enter'], label: 'In a list: start the next item (twice to end the list)' },
  { keys: ['Tab'], label: 'In a list: indent the item' },
  { keys: ['Esc'], label: 'Close a window, or the open note' },
  { keys: ['N'], label: 'New note' },
  { keys: ['E'], label: 'Edit the open note' },
  { keys: ['/'], label: 'Search the notes' },
  { keys: ['J', 'K'], label: 'Next / previous note' },
  { keys: ['L'], label: 'Lock the vault' },
  { keys: ['?'], label: 'Show this list' },
];

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <div>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Single-letter shortcuts work when you are not typing in a box.
          </DialogDescription>
        </div>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map(({ keys, label }) => (
            <li key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground">
                      {key}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
