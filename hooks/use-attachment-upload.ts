'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareImageForUpload } from '@/lib/image-resize';
import { formatBytes, type NoteAttachment } from '@/lib/notes-model';
import type { PickedFile } from '@/lib/dropped-files';

export interface UploadJob {
  id: string;
  name: string;
  path: string;
  size: number;
  /** 0..1 while the bytes are sent. */
  progress: number;
  stage: 'queued' | 'preparing' | 'uploading' | 'error';
  error?: string;
}

interface UploadCallbacks {
  onStart?: (job: UploadJob, picked: PickedFile) => void;
  onDone?: (job: UploadJob, picked: PickedFile, attachment: NoteAttachment) => void;
  onFail?: (job: UploadJob, picked: PickedFile, message: string) => void;
}

const CONCURRENCY = 3;
/** Photos above this are squeezed before upload (smaller storage, faster upload). */
const COMPRESS_ABOVE = 2.5 * 1024 * 1024;
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

function send(
  file: File,
  path: string,
  signal: AbortSignal,
  onProgress: (fraction: number) => void
): Promise<NoteAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const query = new URLSearchParams({ name: file.name });
    if (path) query.set('path', path);
    xhr.open('POST', `/api/notes/files?${query}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () =>
      reject(new Error('The upload could not reach the server. Check your connection.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Try again.'));
    xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.onload = () => {
      let data: { file?: NoteAttachment; error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.file) return resolve(data.file);
      if (xhr.status === 401) return reject(new Error('UNAUTHORIZED'));
      if (xhr.status === 413 && !data?.error) {
        return reject(new Error('This file is larger than the server accepts.'));
      }
      reject(new Error(data?.error || `The upload failed (${xhr.status}).`));
    };
    xhr.send(file);
  });
}

/**
 * Uploads files picked from the computer into the vault: a few at a time, with progress, a
 * size check before anything is sent, and big photos squeezed first. The caller decides what
 * happens to each stored file (put it in the text, list it).
 */
export function useAttachmentUpload(options: { maxBytes: number; onUnauthorized: () => void }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const patch = useCallback((id: string, changes: Partial<UploadJob>) => {
    setJobs((list) => list.map((job) => (job.id === id ? { ...job, ...changes } : job)));
  }, []);

  const dismiss = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setJobs((list) => list.filter((job) => job.id !== id));
  }, []);

  const upload = useCallback(
    async (picked: PickedFile[], callbacks: UploadCallbacks = {}): Promise<NoteAttachment[]> => {
      const results: NoteAttachment[] = [];
      const queue = picked.map((p) => ({
        picked: p,
        job: {
          id: Math.random().toString(36).slice(2),
          name: p.file.name,
          path: p.path,
          size: p.file.size,
          progress: 0,
          stage: 'queued',
        } satisfies UploadJob,
      }));
      setJobs((list) => [...list, ...queue.map((q) => q.job)]);

      const run = async ({ picked: p, job }: (typeof queue)[number]) => {
        const { maxBytes, onUnauthorized } = optionsRef.current;
        callbacks.onStart?.(job, p);
        const fail = (message: string) => {
          patch(job.id, { stage: 'error', error: message });
          callbacks.onFail?.(job, p, message);
        };
        if (p.file.size > maxBytes) {
          return fail(
            `This file is ${formatBytes(p.file.size)}. Files can be up to ${formatBytes(maxBytes)}.`
          );
        }
        const controller = new AbortController();
        controllers.current.set(job.id, controller);
        try {
          let file = p.file;
          if (COMPRESSIBLE.has(file.type) && file.size > COMPRESS_ABOVE) {
            patch(job.id, { stage: 'preparing' });
            try {
              file = (await prepareImageForUpload(file, 'cover')).file;
            } catch {
              file = p.file; // keep the original if it cannot be squeezed
            }
          }
          patch(job.id, { stage: 'uploading' });
          const stored = await send(file, p.path, controller.signal, (fraction) =>
            patch(job.id, { progress: fraction })
          );
          results.push(stored);
          callbacks.onDone?.(job, p, stored);
          controllers.current.delete(job.id);
          setJobs((list) => list.filter((j) => j.id !== job.id));
        } catch (error) {
          controllers.current.delete(job.id);
          if (error instanceof DOMException && error.name === 'AbortError') {
            callbacks.onFail?.(job, p, 'Cancelled');
            return;
          }
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            onUnauthorized();
            return fail('Your session ended. Unlock the vault again.');
          }
          fail(error instanceof Error ? error.message : 'The upload failed.');
        }
      };

      // A small pool: CONCURRENCY uploads at a time, in the order the files were picked.
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (next < queue.length) await run(queue[next++]);
        })
      );
      return results;
    },
    [patch]
  );

  return { jobs, upload, dismiss, busy: jobs.some((j) => j.stage !== 'error') };
}
