'use client';

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Activator,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Every drag-and-drop admin list (Projects, Experience, Skills, Roadmap,
 * Gallery, Global socials, the Sections & Layout board, and every
 * collection-editor-backed module) renders form inputs inside each sortable
 * card. dnd-kit's default sensors activate from a pointerdown/keydown
 * anywhere the listeners are attached - if that ever includes an ancestor of
 * a text input, a focused input's Space keystroke gets read by the
 * KeyboardSensor as "start dragging" and preventDefault()'d, silently
 * swallowing the space character ("the Spacebar bug").
 *
 * The real fix is architectural (SortableItem now *requires* a dedicated
 * `data-dnd-handle` grip, so listeners are never attached to a node that
 * contains form fields - see components/sortable-item.tsx). This sensor pair
 * is the defense-in-depth layer on top of that: even if a future sortable
 * list is wired up incorrectly, activation is refused outright whenever the
 * triggering event originates inside an input/textarea/select/button that
 * isn't the drag handle itself.
 */
function isFormElement(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input, textarea, select, button');
}

function isDragHandle(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-dnd-handle]');
}

function guardActivators<T>(activators: Activator<T>[]): Activator<T>[] {
  return activators.map((activator): Activator<T> => ({
    ...activator,
    handler: (event, options, context) => {
      const target: EventTarget | null = (event as any)?.nativeEvent?.target ?? null;
      if (isFormElement(target) && !isDragHandle(target)) return false;
      return activator.handler(event, options, context);
    },
  }));
}

class SafePointerSensor extends PointerSensor {
  static activators = guardActivators(PointerSensor.activators) as typeof PointerSensor.activators;
}

class SafeKeyboardSensor extends KeyboardSensor {
  static activators = guardActivators(
    KeyboardSensor.activators
  ) as typeof KeyboardSensor.activators;
}

/** Drop-in replacement for `useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))`. */
export function useSafeDndSensors() {
  return useSensors(
    useSensor(SafePointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(SafeKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
