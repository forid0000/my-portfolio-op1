import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import React from 'react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Required, not optional: dnd-kit's pointer/keyboard listeners are attached
   * ONLY to this dedicated handle button, never to the card itself. A card
   * that contains form inputs (every admin editor does) must never have drag
   * listeners on an ancestor of those inputs - otherwise a focused input's
   * Space keystroke gets read by the KeyboardSensor as "start dragging" and
   * preventDefault()'d, silently swallowing the space character. Making this
   * required turns "forgot to add a handle" into a compile error instead of
   * a runtime bug.
   */
  dragHandleClassName: string;
}

export function SortableItem({ id, children, className, dragHandleClassName }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // `relative` and `group` are baked in unconditionally - not left to each
      // caller to remember - because the handle button below is absolutely
      // positioned and needs a guaranteed, correctly-positioned ancestor to
      // anchor to. An inline `style={{ position: 'static' }}` here (as this
      // used to have, toggled off except while actively dragging) would win
      // over any `relative` class the caller passes, since inline styles
      // always beat stylesheet rules for the same property - silently
      // detaching the handle from its own row whenever not mid-drag, i.e.
      // always, right when a user is trying to find it.
      className={`relative group ${className || ''} ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <button
        type="button"
        data-dnd-handle="true"
        aria-label="Drag to reorder"
        className={`absolute text-muted-foreground hover:text-foreground/80 transition-colors cursor-grab active:cursor-grabbing ${dragHandleClassName} ${dragHandleClassName.includes('absolute') ? '' : 'absolute'}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>
      {children}
    </div>
  );
}
