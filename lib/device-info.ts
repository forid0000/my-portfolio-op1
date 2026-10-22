/**
 * Client-only hardware/browser fingerprint gathering. Shared by the /kits/system
 * diagnostics page and the public contact form (attached to submissions as
 * context for the site owner). Must only be called from client components.
 */
export interface ClientDeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  cores: number;
  memoryGb: number | null;
  gpu: string;
  gpuVendor: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
    touch: boolean;
    orientation: string;
  };
  viewport: {
    width: number;
    height: number;
  };
  connection: {
    type: string | null;
    downlinkMbps: number | null;
    rttMs: number | null;
  };
  battery: {
    level: string;
    status: string;
  };
  timezone: string;
  timezoneOffsetMinutes: number;
  referrer: string;
  pageUrl: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean | null;
  colorScheme: 'dark' | 'light' | 'no-preference';
  reducedMotion: boolean;
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
  };
}

function detectGpu(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && debugInfo) {
      return {
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string,
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string,
      };
    }
  } catch {
    // WebGL unavailable or blocked
  }
  return { renderer: 'Integrated / Unknown', vendor: 'Unknown' };
}

async function detectBattery(nav: any): Promise<ClientDeviceInfo['battery']> {
  if (!nav.getBattery) return { level: 'N/A', status: 'N/A' };
  try {
    const b = await nav.getBattery();
    return {
      level: `${Math.round(b.level * 100)}%`,
      status: b.charging ? 'Charging' : 'Discharging',
    };
  } catch {
    return { level: 'N/A', status: 'N/A' };
  }
}

function detectStorageSupport(kind: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[kind];
    const testKey = '__global_id_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export async function getClientDeviceInfo(): Promise<ClientDeviceInfo> {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  const [{ renderer: gpu, vendor: gpuVendor }, battery] = [detectGpu(), await detectBattery(nav)];

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;

  return {
    userAgent: nav.userAgent,
    platform: nav.platform || 'Unknown',
    language: nav.language || 'Unknown',
    languages: nav.languages ? Array.from(nav.languages) : [],
    cores: nav.hardwareConcurrency || 0,
    memoryGb: nav.deviceMemory ?? null,
    gpu,
    gpuVendor,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touch: nav.maxTouchPoints > 0,
      orientation: window.screen.orientation?.type || 'Unknown',
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    connection: {
      type: connection?.effectiveType ? connection.effectiveType.toUpperCase() : null,
      downlinkMbps: connection?.downlink ?? null,
      rttMs: connection?.rtt ?? null,
    },
    battery,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    referrer: document.referrer || '',
    pageUrl: window.location.href,
    cookiesEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack === '1' ? true : nav.doNotTrack === '0' ? false : null,
    colorScheme: prefersDark ? 'dark' : prefersLight ? 'light' : 'no-preference',
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    storage: {
      localStorage: detectStorageSupport('localStorage'),
      sessionStorage: detectStorageSupport('sessionStorage'),
    },
  };
}
