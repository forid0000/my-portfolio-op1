/**
 * Client-only: the one upload pipeline every admin screen uses.
 *   pick file -> (images) smart compression -> ask our server for a signature
 *   -> POST the bytes straight to Cloudinary with live progress -> MediaItem.
 * Files never pass through our server (see lib/media-server.ts for why).
 */
import { prepareImageForUpload, type ImageUsage } from '@/lib/image-resize';
import {
  MAX_VIDEO_UPLOAD_BYTES,
  MEDIA_SCOPES,
  formatBytes,
  isVideoFile,
  type MediaItem,
  type MediaKind,
  type MediaScope,
} from '@/lib/media-types';

export interface UploadOptions {
  scope: MediaScope;
  /** Overrides the compression preset (defaults by scope). */
  usage?: ImageUsage;
  signal?: AbortSignal;
  /** 0..1 while the bytes are being sent. */
  onProgress?: (fraction: number) => void;
  /** Called with a short status such as "Optimizing…" so the UI can show what is happening. */
  onStage?: (stage: 'optimizing' | 'uploading') => void;
}

export interface UploadResult {
  item: MediaItem;
  /** Set when an image was compressed, for a friendly "8.2 MB → 640 KB" note. */
  optimized?: { from: number; to: number };
}

const DEFAULT_USAGE: Record<MediaScope, ImageUsage> = {
  avatars: 'avatar',
  projects: 'cover',
  certifications: 'cover',
  testimonials: 'badge',
  services: 'cover',
  education: 'cover',
  articles: 'cover',
};

interface SignResponse {
  endpoint: string;
  apiKey: string;
  params: Record<string, string | number>;
  signature: string;
}

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
  error?: { message?: string };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  const message = data && typeof data.error === 'string' ? data.error : '';
  return message || fallback;
}

async function requestSignature(
  scope: MediaScope,
  kind: MediaKind,
  signal?: AbortSignal
): Promise<SignResponse> {
  const res = await fetch('/api/admin/media/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, kind }),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not start the upload.'));
  return (await res.json()) as SignResponse;
}

function postToCloudinary(
  sign: SignResponse,
  file: File,
  signal: AbortSignal | undefined,
  onProgress: ((fraction: number) => void) | undefined
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('api_key', sign.apiKey);
    form.append('signature', sign.signature);
    for (const [key, value] of Object.entries(sign.params)) form.append(key, String(value));
    form.append('file', file);

    xhr.open('POST', sign.endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () =>
      reject(new Error('The upload could not reach Cloudinary. Check your connection and retry.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Try again.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    xhr.onload = () => {
      let data: CloudinaryUploadResponse | null = null;
      try {
        data = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url && data.public_id) {
        resolve(data);
      } else {
        reject(new Error(data?.error?.message || `Cloudinary rejected the file (${xhr.status}).`));
      }
    };

    if (signal) {
      if (signal.aborted) return reject(new DOMException('Upload cancelled', 'AbortError'));
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

/** Compresses (images), signs and uploads one file. Rejects with a readable Error. */
export async function uploadMedia(file: File, options: UploadOptions): Promise<UploadResult> {
  const { scope, signal, onProgress, onStage } = options;
  const kind: MediaKind = isVideoFile(file) ? 'video' : 'image';

  if (kind === 'video') {
    if (!MEDIA_SCOPES[scope].allowVideo) throw new Error('Videos are not supported here.');
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      throw new Error(
        `This video is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_VIDEO_UPLOAD_BYTES)}.`
      );
    }
  } else if (!file.type.startsWith('image/')) {
    throw new Error(
      'Choose a picture (JPG, PNG, WebP, GIF)' +
        (MEDIA_SCOPES[scope].allowVideo ? ' or a video (MP4, WebM, MOV).' : '.')
    );
  }

  let toSend = file;
  let optimized: UploadResult['optimized'];
  if (kind === 'image') {
    onStage?.('optimizing');
    const prepared = await prepareImageForUpload(file, options.usage ?? DEFAULT_USAGE[scope]);
    toSend = prepared.file;
    if (prepared.optimized) optimized = { from: prepared.originalBytes, to: prepared.file.size };
  }

  onStage?.('uploading');
  const sign = await requestSignature(scope, kind, signal);
  const uploaded = await postToCloudinary(sign, toSend, signal, onProgress);

  const item: MediaItem = {
    kind,
    src: uploaded.secure_url,
    public_id: uploaded.public_id,
    ...(uploaded.width ? { width: Math.round(uploaded.width) } : {}),
    ...(uploaded.height ? { height: Math.round(uploaded.height) } : {}),
    ...(uploaded.bytes ? { bytes: Math.round(uploaded.bytes) } : {}),
    ...(kind === 'video' && uploaded.duration
      ? { duration: Math.round(uploaded.duration * 10) / 10 }
      : {}),
  };
  return { item, optimized };
}
