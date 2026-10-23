import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createSlugger, splitBlocks, textOfChildren, type Segment } from '@/lib/article-markdown';
import {
  isCloudinaryUrl,
  videoMp4Url,
  videoPosterUrl,
  withTransformation,
} from '@/lib/cloudinary-url';
import { playbackOptions, type MediaItem } from '@/lib/media-types';
import { isSafeHref } from '@/lib/safe-href';
import ZoomableImage from '@/components/articles/zoomable-image';

interface ArticleBodyProps {
  body: string;
  /** Uploaded files of the article, to size pictures and honour each video's playback options. */
  media?: MediaItem[];
}

const BLOCK_LABEL: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
};

function buildComponents(media: Map<string, MediaItem>): Components {
  // Heading ids are handed out in reading order, the same order the table of contents uses.
  const slug = createSlugger();
  const heading = (Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
    function Heading({ children }: { children?: React.ReactNode }) {
      const id = slug(textOfChildren(children) || 'section');
      return (
        <Tag id={id}>
          {children}
          <a href={`#${id}`} className="heading-anchor" aria-label="Link to this section">
            #
          </a>
        </Tag>
      );
    };

  return {
    h1: heading('h2'), // the article title is the page's h1
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    h5: heading('h5'),
    h6: heading('h6'),
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
      // Only https pictures; the site's content-security-policy decides which hosts actually load.
      if (!/^https:\/\//i.test(url)) return null;
      const item = media.get(url);
      const caption = (alt ?? '').trim();

      if (isCloudinaryUrl(url) && url.includes('/video/upload/')) {
        const play = playbackOptions(item ?? { src: url, public_id: '', kind: 'video' });
        return (
          <span className="article-figure">
            <video
              controls={play.controls}
              autoPlay={play.autoplay}
              muted={play.muted}
              loop={play.loop}
              playsInline
              preload="metadata"
              poster={videoPosterUrl(url)}
            >
              <source src={videoMp4Url(url)} type="video/mp4" />
            </video>
            {caption && <span className="article-caption">{caption}</span>}
          </span>
        );
      }

      return (
        <span className="article-figure">
          <ZoomableImage
            src={withTransformation(url, 'c_limit,w_1400,q_auto,f_auto')}
            full={withTransformation(url, 'c_limit,w_2400,q_auto,f_auto')}
            alt={caption}
            width={item?.width}
            height={item?.height}
          />
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

/**
 * The text of an article, rendered on the server so it is in the page HTML. Plain Markdown plus
 * the `:::` blocks (centered, right-aligned, note, tip, warning). Raw HTML is never rendered.
 */
export default function ArticleBody({ body, media = [] }: ArticleBodyProps) {
  const bySrc = new Map(media.map((m) => [m.src, m]));
  const components = buildComponents(bySrc);
  const segments: Segment[] = splitBlocks(body);

  return (
    <div className="article-prose">
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
  );
}
