'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy } from 'lucide-react';

interface TotpEnrollProps {
  /** otpauth:// URI for the authenticator app. */
  uri: string;
  /** Base32 secret, shown for manual entry. */
  secret: string;
  /** Confirmation code typed by the user from the new authenticator entry. */
  code: string;
  onCodeChange: (value: string) => void;
  codeLabel?: string;
}

/**
 * Shows a QR code (rendered locally in the browser - the secret never leaves the
 * page), the manual-entry key, and a field for the first code to confirm it works.
 */
export function TotpEnroll({
  uri,
  secret,
  code,
  onCodeChange,
  codeLabel = 'Code from the new entry',
}: TotpEnrollProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the key is visible and selectable */
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      <div className="rounded-lg bg-white p-1 shrink-0">
        <QRCodeSVG value={uri} size={168} level="M" marginSize={2} />
      </div>
      <div className="space-y-4 min-w-0 flex-1">
        <div className="space-y-1">
          <p className="text-xs text-gray-400">
            Scan the QR code with an authenticator app (Aegis, 2FAS, Google Authenticator,
            1Password...), or enter this key manually:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-md border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-xs text-emerald-300 select-all">
              {secret}
            </code>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy key"
              className="shrink-0 rounded-md border border-gray-700 p-2 text-gray-400 hover:text-gray-100 hover:border-gray-500 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium">{codeLabel}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="000000"
            className="w-40 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-center text-lg font-mono tracking-[0.3em] text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
