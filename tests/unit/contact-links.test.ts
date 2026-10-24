import { describe, expect, it } from 'vitest';
import { displayNumber, mailtoHref, telHref, whatsappHref } from '@/lib/contact-links';

describe("links that open the visitor's own apps", () => {
  it('makes a mail link from an email address, and nothing from anything else', () => {
    expect(mailtoHref('you@example.com')).toBe('mailto:you@example.com');
    expect(mailtoHref('  you@example.com ')).toBe('mailto:you@example.com');
    expect(mailtoHref('not an email')).toBeNull();
    expect(mailtoHref('a@b')).toBeNull();
    expect(mailtoHref('javascript:alert(1)')).toBeNull();
    expect(mailtoHref('')).toBeNull();
    expect(mailtoHref(undefined)).toBeNull();
  });

  it('makes a dial link, keeping a leading +', () => {
    expect(telHref('+880 1712-345678')).toBe('tel:+8801712345678');
    expect(telHref('(555) 123-4567')).toBe('tel:5551234567');
    expect(telHref('12')).toBeNull();
    expect(telHref('call me')).toBeNull();
    expect(telHref('+1234567890123456789')).toBeNull();
  });

  it('opens WhatsApp for a number, and follows a link as given', () => {
    expect(whatsappHref('+880 1712-345678')).toBe('https://wa.me/8801712345678');
    expect(whatsappHref('8801712345678')).toBe('https://wa.me/8801712345678');
    expect(whatsappHref('https://wa.me/8801712345678')).toBe('https://wa.me/8801712345678');
    expect(whatsappHref('wa.me/8801712345678')).toBe('https://wa.me/8801712345678');
    expect(whatsappHref('https://api.whatsapp.com/send?phone=123456789')).toBe(
      'https://api.whatsapp.com/send?phone=123456789'
    );
    expect(whatsappHref('/whatsapp')).toBe('/whatsapp');
  });

  it('never makes a link from something unsafe or empty', () => {
    expect(whatsappHref('javascript:alert(1)')).toBeNull();
    expect(whatsappHref('hello there')).toBeNull();
    expect(whatsappHref('12')).toBeNull();
    expect(whatsappHref('')).toBeNull();
    expect(whatsappHref(null)).toBeNull();
  });

  it('shows the number, not a long link', () => {
    expect(displayNumber('+880 1712', 'https://wa.me/8801712345678')).toBe('+880 1712');
    expect(displayNumber('', 'https://wa.me/8801712345678')).toBe('+8801712345678');
    expect(displayNumber('', '+880 1712-345678')).toBe('+880 1712-345678');
    expect(displayNumber('', '/whatsapp')).toBe('/whatsapp');
  });
});
