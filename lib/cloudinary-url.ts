/**
 * Pure helpers for Cloudinary delivery URLs (safe in server and client code).
 * Every stored media item keeps the plain `secure_url` Cloudinary returned; the
 * variants below (round favicon, share image, web-safe video, poster frame) are
 * derived on the fly by inserting a transformation after `/upload/`, so nothing
 * extra is stored and nothing can drift out of sync with the original.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';
const UPLOAD_MARKER = '/upload/';

export function isCloudinaryUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

/** Inserts a delivery transformation; any non-Cloudinary URL is returned untouched. */
export function withTransformation(url: string, transformation: string): string {
  if (!isCloudinaryUrl(url)) return url;
  const at = url.indexOf(UPLOAD_MARKER);
  if (at === -1) return url;
  const head = url.slice(0, at + UPLOAD_MARKER.length);
  return `${head}${transformation}/${url.slice(at + UPLOAD_MARKER.length)}`;
}

/** Replaces the file extension (Cloudinary converts the format on delivery). */
function withExtension(url: string, ext: string): string {
  return url.replace(/\.[A-Za-z0-9]+(?=($|[?#]))/, `.${ext}`);
}

/** Small round PNG of the avatar for the browser tab (the favicon). */
export function faviconUrl(avatarUrl: string, size = 96): string {
  if (!isCloudinaryUrl(avatarUrl)) return avatarUrl;
  return withExtension(
    withTransformation(avatarUrl, `c_fill,g_auto,w_${size},h_${size},r_max,f_png`),
    'png'
  );
}

/** JPEG share image (Open Graph / Twitter): crawlers want jpg or png within size limits. */
export function shareImageUrl(avatarUrl: string): string {
  if (!isCloudinaryUrl(avatarUrl)) return avatarUrl;
  return withExtension(withTransformation(avatarUrl, 'c_limit,w_1200,h_1200,f_jpg,q_auto'), 'jpg');
}

/** Web-safe MP4 (H.264) of an uploaded video; Cloudinary transcodes on first request. */
export function videoMp4Url(src: string): string {
  if (!isCloudinaryUrl(src)) return src;
  return withExtension(withTransformation(src, 'q_auto,vc_h264'), 'mp4');
}

/** A JPEG frame from the start of the video, used as the poster before playback. */
export function videoPosterUrl(src: string, width = 1280): string {
  if (!isCloudinaryUrl(src)) return src;
  return withExtension(withTransformation(src, `so_0,f_jpg,q_auto,w_${width}`), 'jpg');
}
