import { Award, FileBadge } from 'lucide-react';
import Image from 'next/image';
import CardMedia from '@/components/site/card-media';
import LinkIcon from '@/components/site/link-icon';
import DetailCard from '@/components/site/detail-card';
import SectionHeading from '@/components/section-heading';
import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
import { mediaSummary, toMediaItems } from '@/lib/media-display';
import { toHref } from '@/lib/safe-href';
import type { MediaItem } from '@/lib/media-types';
import type { IconMap } from '@/lib/icons/icon-data';
import { linkIconName } from '@/lib/link-icon';

export interface CertificationItem {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  /** Text and icon of the verification button; empty = "Verify this certificate" and an automatic icon. */
  credentialLabel?: string;
  credentialIcon?: string;
  badge?: { src: string; public_id: string };
  /** Certificate scans, photos or videos; the first is the cover. */
  media?: MediaItem[];
}

interface CertificationsProps {
  content?: CertificationItem[];
  heading?: string;
  terminalPrefix?: string;
  /** Drawings of the verification icons (resolved on the server). */
  icons?: IconMap;
}

/** The words of the verification button. */
export const verifyLabel = (item: CertificationItem) =>
  item.credentialLabel?.trim() || 'Verify this certificate';

/** The icon of the verification button: the owner's pick, else guessed from the words and address. */
export const verifyIcon = (item: CertificationItem) =>
  linkIconName({
    label: verifyLabel(item),
    url: item.credentialUrl,
    icon: item.credentialIcon,
  });

function dates(item: CertificationItem): string {
  return `${item.issueDate ?? ''}${item.expiryDate ? ` → ${item.expiryDate}` : ''}`.trim();
}

/** Everything about the certificate, shown in the window that opens when the card is clicked. */
function CertificateDetail({
  item,
  media,
  icons,
}: {
  item: CertificationItem;
  media: MediaItem[];
  icons?: IconMap;
}) {
  const verify = toHref(item.credentialUrl);
  return (
    <div className="space-y-5">
      <header className="space-y-1.5 pr-10 lg:pr-0">
        <h3 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl" dir="auto">
          {item.name}
        </h3>
        <p className="text-base font-medium text-primary" dir="auto">
          {item.issuer}
        </p>
        {media.length > 0 && <p className="text-sm text-muted-foreground">{mediaSummary(media)}</p>}
      </header>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {item.issueDate && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issued</dt>
            <dd className="mt-0.5 text-foreground">{item.issueDate}</dd>
          </div>
        )}
        {item.expiryDate && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Expires</dt>
            <dd className="mt-0.5 text-foreground">{item.expiryDate}</dd>
          </div>
        )}
        {item.credentialId && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Credential ID</dt>
            <dd className="mt-0.5 break-all text-foreground terminal:font-mono">
              {item.credentialId}
            </dd>
          </div>
        )}
      </dl>

      {verify && (
        <div className="border-t border-border pt-5">
          <a
            href={verify}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {verifyLabel(item)}{' '}
            <LinkIcon name={verifyIcon(item)} icons={icons} className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function Certifications({
  content,
  heading = 'certifications',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
  icons,
}: CertificationsProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="certifications" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <SectionHeading title={heading} prefix={terminalPrefix} path={heading} icon={<Award />} />

        {/* Cards with a certificate picture are much taller than plain ones: let each keep its own height. */}
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {content.map((item, idx) => {
            const media = toMediaItems(item.media);
            const badge = toMediaItems(undefined, item.badge);
            // The window shows the certificate pictures; with none, the badge picture stands in.
            const shown = media.length ? media : badge;
            const verify = toHref(item.credentialUrl);
            const when = dates(item);
            const interactive = shown.length > 0 || !!item.credentialId;

            return (
              <div
                key={`${item.name}-${idx}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <DetailCard
                  title={item.name}
                  label={`View certificate: ${item.name}`}
                  media={shown}
                  detail={
                    interactive ? (
                      <CertificateDetail item={item} media={shown} icons={icons} />
                    ) : null
                  }
                  interactive={interactive}
                  className="rounded-xl"
                >
                  <article className="flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card/20 transition-all duration-500 group-hover/detail:border-primary/40 group-hover/detail:bg-card/30">
                    <CardMedia
                      items={media}
                      title={item.name}
                      aspect="aspect-[4/3]"
                      thumbs={false}
                    />
                    <div className="flex flex-1 gap-4 p-5">
                      {badge[0] ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-background/50">
                          <Image
                            src={badge[0].src}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                          />
                        </div>
                      ) : (
                        media.length === 0 && (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-primary/5">
                            <Award className="h-6 w-6 text-primary/70" />
                          </div>
                        )
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-sm font-bold text-foreground" dir="auto">
                          {item.name}
                        </h3>
                        <p className="truncate text-xs text-primary terminal:font-mono">
                          {item.issuer}
                        </p>
                        {when && (
                          <p className="mt-1 text-[11px] text-muted-foreground/70 terminal:font-mono">
                            {when}
                          </p>
                        )}
                        {item.credentialId && (
                          <p className="mt-1 truncate text-[11px] text-muted-foreground/70 terminal:font-mono">
                            ID: {item.credentialId}
                          </p>
                        )}
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                          {verify ? (
                            <a
                              href={verify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative z-10 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                              {item.credentialLabel?.trim() || 'Verify'}{' '}
                              <LinkIcon name={verifyIcon(item)} icons={icons} className="h-3 w-3" />
                            </a>
                          ) : (
                            <span />
                          )}
                          {interactive && (
                            <span
                              aria-hidden="true"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors group-hover/detail:text-primary"
                            >
                              <FileBadge className="h-3 w-3" /> View
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </DetailCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
