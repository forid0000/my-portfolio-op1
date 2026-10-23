'use client';

import {
  AlignCenter,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Info,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  SquareCode,
  Strikethrough,
  Table2,
  TriangleAlert,
} from 'lucide-react';

export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bullets'
  | 'numbers'
  | 'tasks'
  | 'quote'
  | 'link'
  | 'media'
  | 'table'
  | 'divider'
  | 'codeblock'
  | 'center'
  | 'right'
  | 'note'
  | 'tip'
  | 'warning';

const GROUPS: {
  id: string;
  items: { action: ToolbarAction; label: string; icon: typeof Bold; shortcut?: string }[];
}[] = [
  {
    id: 'text',
    items: [
      { action: 'bold', label: 'Bold', icon: Bold, shortcut: 'Ctrl+B' },
      { action: 'italic', label: 'Italic', icon: Italic, shortcut: 'Ctrl+I' },
      { action: 'strike', label: 'Strikethrough', icon: Strikethrough },
      { action: 'code', label: 'Inline code', icon: Code },
    ],
  },
  {
    id: 'headings',
    items: [
      { action: 'h2', label: 'Heading', icon: Heading2 },
      { action: 'h3', label: 'Subheading', icon: Heading3 },
      { action: 'h4', label: 'Small heading', icon: Heading4 },
    ],
  },
  {
    id: 'lists',
    items: [
      { action: 'bullets', label: 'Bulleted list', icon: List },
      { action: 'numbers', label: 'Numbered list', icon: ListOrdered },
      { action: 'tasks', label: 'Checklist', icon: ListChecks },
      { action: 'quote', label: 'Quote', icon: Quote },
    ],
  },
  {
    id: 'insert',
    items: [
      { action: 'link', label: 'Link', icon: Link2, shortcut: 'Ctrl+K' },
      { action: 'media', label: 'Picture or video', icon: ImagePlus },
      { action: 'table', label: 'Table', icon: Table2 },
      { action: 'divider', label: 'Divider line', icon: Minus },
      { action: 'codeblock', label: 'Code block', icon: SquareCode },
    ],
  },
  {
    id: 'blocks',
    items: [
      { action: 'center', label: 'Center text', icon: AlignCenter },
      { action: 'right', label: 'Align text right', icon: AlignRight },
      { action: 'note', label: 'Note box', icon: Info },
      { action: 'tip', label: 'Tip box', icon: Lightbulb },
      { action: 'warning', label: 'Warning box', icon: TriangleAlert },
    ],
  },
];

/** The formatting buttons above the article text. Buttons never take focus from the text box. */
export default function ArticleToolbar({
  onAction,
  disabled,
}: {
  onAction: (action: ToolbarAction) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-t-xl border border-b-0 border-gray-800 bg-gray-900 px-2 py-1.5"
    >
      {GROUPS.map((group, gi) => (
        <div key={group.id} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1.5 h-5 w-px bg-gray-800" aria-hidden="true" />}
          {group.items.map(({ action, label, icon: Icon, shortcut }) => (
            <button
              key={action}
              type="button"
              // Keep the selection in the text box when a button is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onAction(action)}
              disabled={disabled}
              title={shortcut ? `${label} (${shortcut})` : label}
              aria-label={label}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100 disabled:opacity-40"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
