import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { splitBlocks, type Segment } from '@/lib/article-markdown';
import { fileKind, type NoteAttachment } from '@/lib/notes-model';
import { isSafeHref } from '@/lib/safe-href';
import ZoomableImage from '@/components/articles/zoomable-image';

const BLOCK_LABEL: Record<string, string> = { note: 'Note', tip: 'Tip', warning: 'Warning' };

/** Pictures may come from an https address or from a file kept with the note. */
const OWN_FILE = /^\/api\/notes\/files\/[a-f0-9]{24}(?:\?download=1)?$/i;

function buildComponents(files: Map<string, NoteAttachment>): Components {
  return {
    // The note's title is the page's h1, so a "# heading" in the text is the next level down.
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children }) => {
      if (!isSafeHref(href)) return <>{children}</>;
      const external = /^https?:/i.test(href);
      return (
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => {
      const url = typeof src === 'string' ? src : '';
      const own = OWN_FILE.test(url);
      if (!own && !/^https:\/\//i.test(url)) return null;
      const caption = (alt ?? '').trim();
      const file = own ? files.get(url.split('/').pop()!.split('?')[0].toLowerCase()) : undefined;
      const kind = file ? fileKind(file.type, file.name) : 'image';

      if (kind === 'video') {
        return (
          <span className="article-figure">
            <video controls playsInline preload="metadata" src={url} />
            {caption && <span className="article-caption">{caption}</span>}
          </span>
        );
      }
      if (kind === 'audio') {
        return (
          <span className="article-figure">
            <audio controls preload="metadata" src={url} className="w-full" />
            {caption && <span className="article-caption">{caption}</span>}
          </span>
        );
      }
      return (
        <span className="article-figure">
          <ZoomableImage src={url} full={url} alt={caption} />
          {caption && <span className="article-caption">{caption}</span>}
        </span>
      );
    },
    table: ({ children }) => (
      <div className="article-table">
        <table>{children}</table>
      </div>
    ),
    input: (props) => <input {...props} disabled readOnly />,
  };
}

function Markdown({ text, components }: { text: string; components: Components }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}

interface NoteBodyProps {
  content: string;
  /** The note's files, so a video or sound added to the text plays instead of showing as a picture. */
  attachments?: NoteAttachment[];
  className?: string;
}

/**
 * The text of a note. The same component shows the live preview while writing, the note in the
 * vault and the public page, so what you see while typing is what is saved. Plain Markdown plus the
 * `:::` boxes (centered, right-aligned, note, tip, warning). Raw HTML is never rendered.
 */
export default function NoteBody({ content, attachments = [], className = '' }: NoteBodyProps) {
  const files = new Map(attachments.map((a) => [a.id.toLowerCase(), a]));
  const components = buildComponents(files);
  const segments: Segment[] = splitBlocks(content);

  return (
    <div className={`article note-doc ${className}`}>
      <div className="article-prose" dir="auto">
        {segments.map((segment, i) =>
          segment.kind === 'md' ? (
            <Markdown key={i} text={segment.text} components={components} />
          ) : (
            <div key={i} className={`article-block article-block-${segment.kind}`}>
              {BLOCK_LABEL[segment.kind] && (
                <p className="article-block-title">{BLOCK_LABEL[segment.kind]}</p>
              )}
              <Markdown text={segment.text} components={components} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
