'use client';

import { cn } from '@/lib/utils';

export type MarqueeDirection = 'left' | 'right' | 'up' | 'down';

export interface MarqueeProps {
  children: React.ReactNode;
  direction?: MarqueeDirection;
  speed?: number;
  fade?: boolean;
  pauseOnHover?: boolean;
  className?: string;
  trackClassName?: string;
}

const HORIZONTAL_FADE =
  '[mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]';
const VERTICAL_FADE =
  '[mask-image:linear-gradient(to_bottom,transparent,#000_6%,#000_94%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_6%,#000_94%,transparent)]';

export function Marquee({
  children,
  direction = 'left',
  speed = 40,
  fade = false,
  pauseOnHover = false,
  className,
  trackClassName,
}: MarqueeProps) {
  const vertical = direction === 'up' || direction === 'down';

  return (
    <div
      aria-hidden
      className={cn(
        'w-full overflow-hidden',
        pauseOnHover && 'pause-on-hover',
        fade && (vertical ? VERTICAL_FADE : HORIZONTAL_FADE),
        className
      )}
    >
      <div
        className={cn(
          'marquee-track flex',
          vertical ? 'h-max w-full flex-col' : 'w-max flex-row',
          trackClassName
        )}
        style={{ animation: `marquee-${direction} ${speed}s linear infinite` }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
