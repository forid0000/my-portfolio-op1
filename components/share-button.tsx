'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  slug: string;
}

export default function ShareButton({ slug }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Construct the full URL dynamically
    const url = `${window.location.origin}/articles/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!'); // Shows the toast

      // Reset the icon back to 'Share' after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 border border-border rounded-lg hover:bg-muted transition-all duration-200 text-muted-foreground hover:text-primary active:scale-95"
      aria-label="Share post"
      title="Copy link to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500 animate-in zoom-in spin-in-90" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
    </button>
  );
}
