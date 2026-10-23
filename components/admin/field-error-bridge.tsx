'use client';

import { useEffect } from 'react';
import { installFieldErrorFetch } from '@/lib/field-errors';

/**
 * Mounted once in the admin layout. Any save that the server rejects with validation issues
 * (HTTP 400 + Zod `details`) scrolls to the field at fault, outlines it in red and writes the
 * reason under it, so no editor needs its own error plumbing. See lib/field-errors.ts.
 */
export default function FieldErrorBridge() {
  useEffect(
    () =>
      installFieldErrorFetch((url) => {
        try {
          const target = new URL(url, window.location.origin);
          return target.origin === window.location.origin && target.pathname.startsWith('/api/');
        } catch {
          return false;
        }
      }),
    []
  );
  return null;
}
