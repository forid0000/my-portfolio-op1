/**
 * Turns the contact details the owner typed (an email, a phone number, a WhatsApp number or link)
 * into addresses that open the visitor's own apps: the mail program, the dialer, WhatsApp.
 * Pure functions, safe in server and client code. Each returns null when the value cannot be made
 * into a safe, working link, and the page then shows the text without a link.
 */
import { toHref } from '@/lib/safe-href';

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
/** Digits with the usual separators; a leading + is kept for tel: links. */
const PHONE = /^\+?[0-9\s\-().]{6,24}$/;

export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/** `mailto:` link for an email address. */
export function mailtoHref(email: string | null | undefined): string | null {
  const value = (email ?? '').trim();
  return EMAIL.test(value) ? `mailto:${encodeURI(value)}` : null;
}

/** `tel:` link for a phone number (opens the dialer on a phone). */
export function telHref(phone: string | null | undefined): string | null {
  const value = (phone ?? '').trim();
  if (!PHONE.test(value)) return null;
  const digits = digitsOf(value);
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${value.startsWith('+') ? '+' : ''}${digits}`;
}

/**
 * Where a "WhatsApp" value should lead. A link (wa.me/..., api.whatsapp.com/..., or a path of
 * this site such as /whatsapp) is used as it is; a plain number becomes https://wa.me/<digits>,
 * which opens WhatsApp on a phone and WhatsApp Web on a computer.
 */
export function whatsappHref(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  if (PHONE.test(text)) {
    const digits = digitsOf(text);
    return digits.length >= 7 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
  }
  return toHref(text);
}

/** What to show as the number: the phone number, else the number inside the WhatsApp value. */
export function displayNumber(phone: string, whatsapp: string): string {
  if (phone.trim()) return phone.trim();
  const text = whatsapp.trim();
  if (PHONE.test(text)) return text;
  const wame = /wa\.me\/\+?(\d{7,15})/i.exec(text);
  if (wame) return `+${wame[1]}`;
  return text;
}
