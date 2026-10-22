/**
 * Lightweight User-Agent parser - no dependency needed for the handful of
 * browser/OS/device buckets we actually display in admin-facing reports.
 */
export interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  isBot: boolean;
}

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg\/([\d.]+)/, 'Edge'],
  [/OPR\/([\d.]+)/, 'Opera'],
  [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/FxiOS\/([\d.]+)/, 'Firefox (iOS)'],
  [/CriOS\/([\d.]+)/, 'Chrome (iOS)'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
  [/MSIE ([\d.]+)/, 'Internet Explorer'],
  [/Trident.*rv:([\d.]+)/, 'Internet Explorer'],
];

const OS_PATTERNS: [RegExp, string, ((m: RegExpMatchArray) => string)?][] = [
  [/Windows NT 10\.0/, 'Windows', () => '10/11'],
  [/Windows NT ([\d.]+)/, 'Windows'],
  [/Mac OS X ([\d_]+)/, 'macOS', (m) => m[1].replace(/_/g, '.')],
  [/Android ([\d.]+)/, 'Android'],
  [/iPad.*OS ([\d_]+)/, 'iPadOS', (m) => m[1].replace(/_/g, '.')],
  [/iPhone OS ([\d_]+)/, 'iOS', (m) => m[1].replace(/_/g, '.')],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      deviceType: 'Desktop',
      isBot: false,
    };
  }

  const isBot = /bot|crawler|spider|slurp|facebookexternalhit|bingpreview/i.test(ua);

  let browser = 'Unknown';
  let browserVersion = '';
  for (const [pattern, name] of BROWSER_PATTERNS) {
    const m = ua.match(pattern);
    if (m) {
      browser = name;
      browserVersion = m[1];
      break;
    }
  }

  let os = 'Unknown';
  let osVersion = '';
  for (const [pattern, name, extractVersion] of OS_PATTERNS) {
    const m = ua.match(pattern);
    if (m) {
      os = name;
      osVersion = extractVersion ? extractVersion(m) : m[1] || '';
      break;
    }
  }

  let deviceType: ParsedUserAgent['deviceType'] = 'Desktop';
  if (/iPad|(?:Tablet(?!.*Mobile))/i.test(ua)) deviceType = 'Tablet';
  else if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) deviceType = 'Mobile';

  return { browser, browserVersion, os, osVersion, deviceType, isBot };
}
