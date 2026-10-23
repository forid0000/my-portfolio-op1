import Image from 'next/image';
import SectionHeading from '@/components/section-heading';
import { Award, ExternalLink } from 'lucide-react';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
export interface CertificationItem {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  badge?: { src: string; public_id: string };
}

interface CertificationsProps {
  content?: CertificationItem[];
  heading?: string;
  terminalPrefix?: string;
}

export default function Certifications({
  content,
  heading = 'certifications',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: CertificationsProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="certifications" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <SectionHeading title={heading} prefix={terminalPrefix} path={heading} icon={<Award />} />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="animate-fade-in-up group bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 rounded-xl p-5 flex gap-4"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {item.badge?.src ? (
                <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-border/30 bg-background/50">
                  <Image
                    src={item.badge.src}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 shrink-0 rounded-lg border border-border/30 bg-primary/5 flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary/70" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                <p className="text-xs text-primary terminal:font-mono truncate">{item.issuer}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 terminal:font-mono">
                  {item.issueDate}
                  {item.expiryDate ? ` → ${item.expiryDate}` : ''}
                </p>
                {item.credentialUrl && (
                  <a
                    href={item.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Verify <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
