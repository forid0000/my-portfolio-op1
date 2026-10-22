import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { lookupIp } from '@/lib/ip-lookup';
import { parseUserAgent } from '@/lib/user-agent';
import { getGlobalContent } from '@/lib/site';
import { getIntegrations } from '@/lib/integrations';
import { SITE_HOST } from '@/lib/site-config';

const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 15 * 60 * 1000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes and truncates client-supplied strings before they reach the email HTML. */
function safe(value: unknown, fallback = 'Unknown', maxLen = 200): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return escapeHtml(value.slice(0, maxLen));
}

function badge(label: string, color: string, bg: string): string {
  return `<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;color:${color};background:${bg};">${label}</span>`;
}

/**
 * Formats a timestamp as "YYYY-MM-DD HH:mm:ss" in the given IANA time zone (the
 * site's configured zone from Admin -> Global Settings), independent of the
 * server's own zone. Falls back to UTC if the zone is invalid.
 */
function formatTimestamp(iso: string | undefined, timeZone: string): string {
  const base = iso ? new Date(iso) : new Date();
  if (Number.isNaN(base.getTime())) return 'Unknown';
  const format = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .format(base)
      .replace(',', '');
  try {
    return format(timeZone);
  } catch {
    return format('UTC');
  }
}

/** Best-effort classification of where the visitor arrived from. */
function classifyReferrer(referrer: string | undefined): string {
  if (!referrer) return 'Direct / Bookmark';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google\.|bing\.|duckduckgo\.|yahoo\./i.test(host)) return `Search - ${host}`;
    if (/facebook\.|instagram\.|linkedin\.|twitter\.|t\.co|x\.com/i.test(host))
      return `Social - ${host}`;
    return `Referral - ${host}`;
  } catch {
    return 'Direct / Bookmark';
  }
}

const clientInfoSchema = z
  .object({
    userAgent: z.string().max(400).optional(),
    platform: z.string().max(100).optional(),
    language: z.string().max(50).optional(),
    languages: z.array(z.string().max(20)).max(10).optional(),
    cores: z.number().optional(),
    memoryGb: z.number().nullable().optional(),
    gpu: z.string().max(200).optional(),
    gpuVendor: z.string().max(100).optional(),
    screen: z
      .object({
        width: z.number(),
        height: z.number(),
        colorDepth: z.number(),
        pixelRatio: z.number(),
        touch: z.boolean(),
        orientation: z.string().max(50),
      })
      .optional(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),
    connection: z
      .object({
        type: z.string().max(20).nullable(),
        downlinkMbps: z.number().nullable(),
        rttMs: z.number().nullable().optional(),
      })
      .optional(),
    battery: z
      .object({
        level: z.string().max(20),
        status: z.string().max(20),
      })
      .optional(),
    timezone: z.string().max(100).optional(),
    timezoneOffsetMinutes: z.number().optional(),
    referrer: z.string().max(500).optional(),
    pageUrl: z.string().max(500).optional(),
    cookiesEnabled: z.boolean().optional(),
    doNotTrack: z.boolean().nullable().optional(),
    colorScheme: z.enum(['dark', 'light', 'no-preference']).optional(),
    reducedMotion: z.boolean().optional(),
    storage: z
      .object({
        localStorage: z.boolean(),
        sessionStorage: z.boolean(),
      })
      .optional(),
  })
  .partial();

const engagementSchema = z
  .object({
    timeOnPageSeconds: z.number().min(0).max(86400).optional(),
    maxScrollDepthPercent: z.number().min(0).max(100).optional(),
    visitCount: z.number().min(0).max(1_000_000).optional(),
    isReturningVisitor: z.boolean().optional(),
    firstVisitAt: z.string().max(50).optional(),
  })
  .partial();

const contactSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Valid phone number is required'),
  location: z.string().optional(),
  purpose: z.string().min(1, 'Purpose is required'),
  message: z.string().min(15, 'Message must be at least 15 characters long'),
  clientInfo: clientInfoSchema.optional(),
  engagement: engagementSchema.optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`contact:${ip}`, CONTACT_LIMIT, CONTACT_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  // Mail delivery is configured through the environment (see .env.example).
  const mail = await getIntegrations([
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'CONTACT_TO_EMAIL',
    'CONTACT_FROM_EMAIL',
  ] as const);
  const smtpUser = mail.SMTP_USER;
  const smtpPass = mail.SMTP_PASS;
  const toEmail = mail.CONTACT_TO_EMAIL;
  const fromEmail = mail.CONTACT_FROM_EMAIL || smtpUser;
  if (!smtpUser || !smtpPass || !toEmail || !fromEmail) {
    console.error(
      'Contact form is not configured: set the SMTP username/password and delivery address in Admin -> Security -> Integrations.'
    );
    return NextResponse.json(
      { error: 'The contact form is not configured on this site yet.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { fullName, email, phone, location, purpose, message, clientInfo, engagement } =
      result.data;

    const eName = escapeHtml(fullName);
    const eEmail = escapeHtml(email);
    const ePhone = escapeHtml(phone);
    const eLocation = escapeHtml(location || 'Not provided');
    const ePurpose = escapeHtml(purpose);
    const eMessage = escapeHtml(message);

    // Timestamps in the email use the site's configured time zone.
    const { timeZone } = await getGlobalContent();
    const tzLabel = escapeHtml(timeZone);

    // Server-side signals: real IP (from proxy headers) + UA header, never
    // trusted from the client body, plus a best-effort geolocation lookup.
    const uaHeader = req.headers.get('user-agent') || '';
    const parsedUA = parseUserAgent(uaHeader);
    const geo = await lookupIp(ip);

    const tzMatch =
      clientInfo?.timezone && geo.timezone ? clientInfo.timezone === geo.timezone : null;

    const geoLocationLabel =
      !geo.failed && (geo.city || geo.country)
        ? [geo.city, geo.region, geo.country].filter(Boolean).join(', ')
        : 'Unknown';

    const securityBadges = geo.failed
      ? badge('UNKNOWN', '#6b7280', '#f3f4f6')
      : [
          geo.vpn ? badge('VPN', '#b91c1c', '#fee2e2') : '',
          geo.proxy ? badge('PROXY', '#b91c1c', '#fee2e2') : '',
          geo.tor ? badge('TOR', '#b91c1c', '#fee2e2') : '',
          !geo.vpn && !geo.proxy && !geo.tor ? badge('CLEAN', '#047857', '#d1fae5') : '',
        ].join('');

    const tzBadge =
      tzMatch === true
        ? badge('MATCH', '#047857', '#d1fae5')
        : tzMatch === false
          ? badge('MISMATCH', '#b45309', '#fef3c7')
          : '';

    const gpuLabel = clientInfo?.gpu
      ? `${clientInfo.gpuVendor && clientInfo.gpuVendor !== 'Unknown' ? safe(clientInfo.gpuVendor, '', 100) + ' - ' : ''}${safe(clientInfo.gpu, 'GPU unknown', 150)}`
      : 'GPU unknown';

    const hardwareLabel = clientInfo
      ? `${clientInfo.cores ?? '?'} cores · ${clientInfo.memoryGb ? clientInfo.memoryGb + ' GB RAM' : 'RAM unknown'} · ${gpuLabel}`
      : 'Not captured';

    const screenLabel = clientInfo?.screen
      ? `${clientInfo.screen.width}×${clientInfo.screen.height} @${clientInfo.screen.pixelRatio}x${clientInfo.viewport ? ` (viewport ${clientInfo.viewport.width}×${clientInfo.viewport.height})` : ''} · ${clientInfo.screen.touch ? 'Touch' : 'No touch'}`
      : 'Not captured';

    const connectionLabel = clientInfo?.connection
      ? `${clientInfo.connection.type || 'Unknown'}${clientInfo.connection.downlinkMbps ? ' · ~' + clientInfo.connection.downlinkMbps + ' Mbps' : ''}${clientInfo.connection.rttMs ? ' · RTT ~' + clientInfo.connection.rttMs + 'ms' : ''}`
      : 'Not captured';

    const batteryLabel = clientInfo?.battery
      ? `${clientInfo.battery.level} (${clientInfo.battery.status})`
      : 'Not captured';

    const timezoneLabel = clientInfo?.timezone
      ? `${safe(clientInfo.timezone, 'Unknown', 100)} ${tzBadge}`
      : 'Not captured';

    const languageLabel = clientInfo?.languages?.length
      ? clientInfo.languages
          .map((l) => safe(l, '', 20))
          .filter(Boolean)
          .join(', ')
      : safe(clientInfo?.language, 'Not captured', 50);

    const browserLabel = `${parsedUA.browser}${parsedUA.browserVersion ? ' ' + parsedUA.browserVersion : ''}${parsedUA.isBot ? ' ' + badge('BOT', '#b91c1c', '#fee2e2') : ''}`;
    const osLabel = `${parsedUA.os}${parsedUA.osVersion ? ' ' + parsedUA.osVersion : ''}`;

    const privacyLabel = clientInfo
      ? `Cookies: ${clientInfo.cookiesEnabled === false ? 'Off' : 'On'} · DNT: ${clientInfo.doNotTrack === true ? 'On' : clientInfo.doNotTrack === false ? 'Off' : 'Unset'} · Storage: ${clientInfo.storage?.localStorage ? 'LS✓' : 'LS✗'}/${clientInfo.storage?.sessionStorage ? 'SS✓' : 'SS✗'}`
      : 'Not captured';

    const prefsLabel = clientInfo
      ? `${clientInfo.colorScheme || 'no-preference'} mode${clientInfo.reducedMotion ? ' · reduced motion' : ''}`
      : 'Not captured';

    const referrerLabel = classifyReferrer(clientInfo?.referrer);
    const landingUrlLabel = safe(clientInfo?.pageUrl, 'Not captured', 300);

    const visitLabel = engagement?.visitCount
      ? `${badge(engagement.isReturningVisitor ? 'RETURNING' : 'FIRST VISIT', engagement.isReturningVisitor ? '#1d4ed8' : '#047857', engagement.isReturningVisitor ? '#dbeafe' : '#d1fae5')} Visit #${engagement.visitCount}${engagement.firstVisitAt ? ` · first seen ${formatTimestamp(engagement.firstVisitAt, timeZone)} ${tzLabel}` : ''}`
      : 'Not captured';

    const engagementLabel = engagement
      ? `${engagement.timeOnPageSeconds ?? '?'}s on page · ${engagement.maxScrollDepthPercent ?? '?'}% max scroll depth`
      : 'Not captured';

    const infoRow = (label: string, value: string) => `
          <tr>
            <td style="padding:5px 0;color:#6b7280;width:130px;vertical-align:top;">${label}</td>
            <td style="padding:5px 0;color:#111827;">${value}</td>
          </tr>`;

    // Any SMTP provider works; Brevo's relay is the default host.
    const smtpPort = Number.parseInt(mail.SMTP_PORT ?? '', 10) || 587;
    const transporter = nodemailer.createTransport({
      host: mail.SMTP_HOST || 'smtp-relay.brevo.com',
      port: smtpPort,
      secure: smtpPort === 465, // implicit TLS on 465, STARTTLS otherwise
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"Portfolio Contact" <${fromEmail}>`,
      to: toEmail,
      replyTo: email,
      subject: `[${ePurpose}] New Inquiry from ${eName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f8;padding:24px;color:#1a1a1a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

            <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 28px;">
              <div style="color:#ecfdf5;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">New Contact Submission</div>
              <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">${eName}</div>
              <div style="display:inline-block;margin-top:10px;background:rgba(255,255,255,0.2);color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;">${ePurpose}</div>
            </div>

            <div style="padding:24px 28px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                ${infoRow('Email', `<a href="mailto:${eEmail}" style="color:#059669;text-decoration:none;">${eEmail}</a>`)}
                ${infoRow('Phone', ePhone)}
                ${infoRow('Location', eLocation)}
              </table>

              <div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #eee;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;margin-bottom:8px;">Message</div>
                <div style="white-space:pre-wrap;color:#111827;line-height:1.6;">${eMessage}</div>
              </div>

              <div style="margin-top:28px;">
                <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#059669;font-weight:700;margin-bottom:12px;border-bottom:2px solid #d1fae5;padding-bottom:8px;">
                  Visitor Intelligence
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  ${infoRow('IP Address', `<span style="font-family:monospace;">${escapeHtml(geo.ip || ip)}</span>`)}
                  ${infoRow('ISP', safe(geo.isp, 'Unknown'))}
                  ${infoRow('Location (IP)', escapeHtml(geoLocationLabel))}
                  ${infoRow('Security', securityBadges)}
                  ${infoRow('Browser', browserLabel)}
                  ${infoRow('OS', osLabel)}
                  ${infoRow('Device', parsedUA.deviceType)}
                  ${infoRow('Hardware', hardwareLabel)}
                  ${infoRow('Screen', screenLabel)}
                  ${infoRow('Connection', connectionLabel)}
                  ${infoRow('Battery', batteryLabel)}
                  ${infoRow('Timezone', timezoneLabel)}
                  ${infoRow('Language', languageLabel)}
                  ${infoRow('Preferences', prefsLabel)}
                  ${infoRow('Privacy Flags', privacyLabel)}
                </table>
              </div>

              <div style="margin-top:28px;">
                <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#059669;font-weight:700;margin-bottom:12px;border-bottom:2px solid #d1fae5;padding-bottom:8px;">
                  Engagement
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  ${infoRow('Came From', referrerLabel)}
                  ${infoRow('Landing URL', landingUrlLabel)}
                  ${infoRow('Visit History', visitLabel)}
                  ${infoRow('This Session', engagementLabel)}
                </table>
              </div>
            </div>

            <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #eee;font-size:11px;color:#9ca3af;">
              Submitted ${formatTimestamp(undefined, timeZone)} ${tzLabel} · ${escapeHtml(SITE_HOST)} contact endpoint
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Transmission sent successfully.' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to establish connection. Try again later.' },
      { status: 500 }
    );
  }
}
