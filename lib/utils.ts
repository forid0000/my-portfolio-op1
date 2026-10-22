import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the current UTC offset label for an IANA time zone, e.g. "UTC+6". */
export function utcOffsetLabel(timeZone: string, date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return name.replace('GMT', 'UTC');
  } catch {
    return '';
  }
}

/** Extracts a human-readable message from an admin API error response body. */
export function extractApiErrorMessage(errorData: any, fallback = 'Failed to save'): string {
  if (Array.isArray(errorData?.details)) {
    return errorData.details.map((d: any) => d?.message || String(d)).join(', ') || fallback;
  }
  if (typeof errorData?.details === 'string' && errorData.details) return errorData.details;
  if (typeof errorData?.error === 'string' && errorData.error) return errorData.error;
  return fallback;
}
