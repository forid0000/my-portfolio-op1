'use client';

import {
  AlignCenter,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  FilePlus2,
  FolderUp,
  Heading,
  ImagePlus,
  Info,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table2,
  TriangleAlert,
  Undo2,
  LayoutPanelTop,
} from 'lucide-react';
import { Menu, MenuItem, MenuSeparator } from '@/components/notes/vault/menu';

export type EditorAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bullets'
  | 'numbers'
  | 'tasks'
  | 'quote'
  | 'link'
  | 'table'
  | 'divider'
  | 'codeblock'
  | 'center'
  | 'right'
  | 'note'
  | 'tip'
  | 'warning'
  | 'undo'
  | 'redo'
  | 'picture'
  | 'files'
  | 'folder';

const button =
  'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4';

function Tool({
  action,
  label,
  shortcut,
  onAction,
  disabled,
  children,
}: {
  action: EditorAction;
  label: string;
  shortcut?: string;
  onAction: (action: EditorAction) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Pressing a button must not take the caret and the selection out of the text.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onAction(action)}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      className={button}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

/**
 * The formatting bar above the writing pane. Groups wrap onto a second line on narrow screens
 * instead of hiding behind a scrollbar. Every colour is a theme token.
 */
export default function EditorToolbar({
  onAction,
  disabled,
}: {
  onAction: (action: EditorAction) => void;
  disabled?: boolean;
}) {
  const t = { onAction, disabled };
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
    >
      <Tool action="undo" label="Undo" shortcut="Ctrl+Z" {...t}>
        <Undo2 />
      </Tool>
      <Tool action="redo" label="Redo" shortcut="Ctrl+Shift+Z" {...t}>
        <Redo2 />
      </Tool>
      <Divider />

      <Menu
        label="Text style"
        className={`${button} w-auto px-2`}
        trigger={
          <>
            <Heading /> <ChevronDown className="!h-3 !w-3 opacity-60" />
          </>
        }
      >
        <MenuItem onSelect={() => onAction('paragraph')}>Normal text</MenuItem>
        <MenuItem onSelect={() => onAction('h1')} hint="#">
          Heading 1
        </MenuItem>
        <MenuItem onSelect={() => onAction('h2')} hint="##">
          Heading 2
        </MenuItem>
        <MenuItem onSelect={() => onAction('h3')} hint="###">
          Heading 3
        </MenuItem>
        <MenuItem onSelect={() => onAction('h4')} hint="####">
          Small heading
        </MenuItem>
      </Menu>
      <Tool action="bold" label="Bold" shortcut="Ctrl+B" {...t}>
        <Bold />
      </Tool>
      <Tool action="italic" label="Italic" shortcut="Ctrl+I" {...t}>
        <Italic />
      </Tool>
      <Tool action="strike" label="Strikethrough" {...t}>
        <Strikethrough />
      </Tool>
      <Tool action="code" label="Inline code" shortcut="Ctrl+E" {...t}>
        <Code />
      </Tool>
      <Divider />

      <Tool action="bullets" label="Bulleted list" {...t}>
        <List />
      </Tool>
      <Tool action="numbers" label="Numbered list" {...t}>
        <ListOrdered />
      </Tool>
      <Tool action="tasks" label="Checklist" {...t}>
        <ListChecks />
      </Tool>
      <Tool action="quote" label="Quote" {...t}>
        <Quote />
      </Tool>
      <Divider />

      <Tool action="link" label="Link" shortcut="Ctrl+K" {...t}>
        <Link2 />
      </Tool>
      <Tool action="picture" label="Picture from your computer" {...t}>
        <ImagePlus />
      </Tool>
      <Tool action="table" label="Table" {...t}>
        <Table2 />
      </Tool>
      <Tool action="codeblock" label="Code block" {...t}>
        <SquareCode />
      </Tool>
      <Tool action="divider" label="Divider line" {...t}>
        <Minus />
      </Tool>
      <Divider />

      <Menu
        label="Alignment and boxes"
        className={`${button} w-auto px-2`}
        trigger={
          <>
            <LayoutPanelTop /> <ChevronDown className="!h-3 !w-3 opacity-60" />
          </>
        }
      >
        <MenuItem icon={<AlignCenter />} onSelect={() => onAction('center')}>
          Center text
        </MenuItem>
        <MenuItem icon={<AlignRight />} onSelect={() => onAction('right')}>
          Align text right
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Info />} onSelect={() => onAction('note')}>
          Note box
        </MenuItem>
        <MenuItem icon={<Lightbulb />} onSelect={() => onAction('tip')}>
          Tip box
        </MenuItem>
        <MenuItem icon={<TriangleAlert />} onSelect={() => onAction('warning')}>
          Warning box
        </MenuItem>
      </Menu>
      <Menu
        label="Attach files"
        className={`${button} w-auto px-2`}
        trigger={
          <>
            <Paperclip /> <span className="hidden text-xs font-medium sm:inline">Attach</span>
            <ChevronDown className="!h-3 !w-3 opacity-60" />
          </>
        }
      >
        <MenuItem icon={<FilePlus2 />} onSelect={() => onAction('files')}>
          Files from your computer…
        </MenuItem>
        <MenuItem icon={<FolderUp />} onSelect={() => onAction('folder')}>
          A whole folder…
        </MenuItem>
      </Menu>
    </div>
  );
}
