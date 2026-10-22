'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Scan,
  Camera,
  Image as ImageIcon,
  Wifi,
  Link as LinkIcon,
  Mail,
  FileText,
  Download,
  XCircle,
  CheckCircle2,
  History,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner'; // Assuming you have sonner or similar for toasts, otherwise remove
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';

// --- Types ---
type GenMode = 'text' | 'url' | 'wifi' | 'email';
type ScanMode = 'camera' | 'file' | 'idle';

interface GenState {
  mode: GenMode;
  value: string;
  ssid: string;
  password: string;
  encryption: string;
  email: string;
  subject: string;
  body: string;
}

interface ScanHistoryItem {
  id: string;
  text: string;
  timestamp: number;
}

// --- Constants ---
// Max characters for QR code at error correction level H (alphanumeric capacity)
const MAX_QR_CHARS = 1273;

// --- Storage Keys ---
const GEN_STORAGE_KEY = 'global-id-qr-gen-state';
const SCAN_HISTORY_KEY = 'global-id-qr-scan-history';

interface QrClientProps {
  icon?: string;
  accentColor?: string;
}

export default function QrClient({ icon, accentColor }: QrClientProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(icon, <QrCode />, headingColorClass);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {headingIcon} QR Command Center
        </h2>

        {/* Mode Switcher */}
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'generate'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> Generate
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'scan'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" /> Scanner
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'generate' ? <GeneratorView /> : <ScannerView />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENT: GENERATOR VIEW                                                  */
/* -------------------------------------------------------------------------- */

function GeneratorView() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Consolidated State
  const [state, setState] = useState<GenState>({
    mode: 'url',
    value: 'https://example.com',
    ssid: '',
    password: '',
    encryption: 'WPA',
    email: '',
    subject: '',
    body: '',
  });

  const [qrValue, setQrValue] = useState('');
  const [isPayloadTooLong, setIsPayloadTooLong] = useState(false);

  // 1. Load State on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GEN_STORAGE_KEY);
      if (saved) {
        setState({ ...state, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load QR gen state', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Save State on Change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(GEN_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // 3. Construct Payload
  useEffect(() => {
    let payload = '';
    switch (state.mode) {
      case 'wifi':
        payload = `WIFI:T:${state.encryption};S:${state.ssid};P:${state.password};;`;
        break;
      case 'email':
        payload = `mailto:${state.email}?subject=${encodeURIComponent(state.subject)}&body=${encodeURIComponent(state.body)}`;
        break;
      case 'url':
      case 'text':
      default:
        payload = state.value;
        break;
    }
    setQrValue(payload);
    setIsPayloadTooLong(payload.length > MAX_QR_CHARS);
  }, [state]);

  const updateState = (field: keyof GenState, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  // [!code focus:start]
  // MODIFIED: Ghost Watermark Logic
  const downloadQr = () => {
    const sourceCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (!sourceCanvas) return;

    // 1. Create a temporary canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 2. Match dimensions
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    // 3. Draw the original QR Code
    ctx.drawImage(sourceCanvas, 0, 0);

    // 4. Add "Ghost" Watermark
    // Slightly smaller font for subtlety (4% of width)
    const fontSize = Math.floor(canvas.width * 0.04);
    ctx.font = `bold ${fontSize}px monospace`;

    // THE TRICK: Use RGBA with very low opacity (0.05 = 5%)
    // This creates the "water mix" look that is barely visible
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Draw text at the bottom center
    // Faint watermark with the host this tool is served from.
    ctx.fillText(window.location.host, canvas.width / 2, canvas.height - 5);

    // 5. Trigger Download
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-code-${state.mode}.png`;
    link.href = url;
    link.click();
  };
  // [!code focus:end]

  return (
    <div className="grid md:grid-cols-12 gap-8">
      {/* Controls */}
      <div className="md:col-span-7 space-y-6">
        {/* Type Selector */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'url', icon: LinkIcon, label: 'URL' },
            { id: 'text', icon: FileText, label: 'Text' },
            { id: 'wifi', icon: Wifi, label: 'WiFi' },
            { id: 'email', icon: Mail, label: 'Email' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => updateState('mode', type.id as GenMode)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                state.mode === type.id
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <type.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold uppercase">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Inputs */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
          {(state.mode === 'url' || state.mode === 'text') && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">
                Payload Content
              </label>
              <textarea
                value={state.value}
                onChange={(e) => updateState('value', e.target.value)}
                className={`w-full bg-black/40 border rounded-lg p-3 text-white focus:ring-1 outline-none min-h-[100px] ${
                  isPayloadTooLong
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                    : 'border-white/10 focus:border-primary focus:ring-primary/50'
                }`}
                placeholder={state.mode === 'url' ? 'https://...' : 'Enter text...'}
              />
              <div
                className={`text-xs text-right ${
                  isPayloadTooLong ? 'text-red-400' : 'text-muted-foreground'
                }`}
              >
                {state.value.length} / {MAX_QR_CHARS} characters
              </div>
            </div>
          )}

          {state.mode === 'wifi' && (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">
                  Network SSID
                </label>
                <input
                  type="text"
                  value={state.ssid}
                  onChange={(e) => updateState('ssid', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">
                    Password
                  </label>
                  <input
                    type="text"
                    value={state.password}
                    onChange={(e) => updateState('password', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">
                    Encryption
                  </label>
                  <select
                    value={state.encryption}
                    onChange={(e) => updateState('encryption', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {state.mode === 'email' && (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">
                  Recipient
                </label>
                <input
                  type="email"
                  value={state.email}
                  onChange={(e) => updateState('email', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Subject</label>
                <input
                  type="text"
                  value={state.subject}
                  onChange={(e) => updateState('subject', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Body</label>
                <textarea
                  value={state.body}
                  onChange={(e) => updateState('body', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary min-h-[80px]"
                />
                {isPayloadTooLong && (
                  <div className="text-xs text-red-400 text-right">
                    Payload too long ({qrValue.length} / {MAX_QR_CHARS} characters)
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Output */}
      <div className="md:col-span-5 flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-xl text-center">
        {isPayloadTooLong ? (
          <div className="flex flex-col items-center gap-4 p-6">
            <XCircle className="w-12 h-12 text-red-400" />
            <div className="space-y-2">
              <p className="text-red-400 font-bold text-sm uppercase">Data Too Long</p>
              <p className="text-muted-foreground text-sm">
                Your input is {qrValue.length.toLocaleString()} characters, but QR codes support a
                maximum of {MAX_QR_CHARS.toLocaleString()} characters at this error correction
                level. Please shorten your content.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl shadow-2xl mb-6">
              <QRCodeCanvas
                id="qr-canvas"
                value={qrValue}
                size={200}
                level={'H'}
                bgColor={'#ffffff'}
                fgColor={'#000000'}
                includeMargin={true}
              />
            </div>
            <button
              onClick={downloadQr}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Download .PNG
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENT: SCANNER VIEW                                                    */
/* -------------------------------------------------------------------------- */

function ScannerView() {
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // 1. Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem(SCAN_HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse scan history');
      }
    }
  }, []);

  // 2. Clean up Scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, []);

  const addToHistory = (text: string) => {
    const newItem: ScanHistoryItem = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now(),
    };

    // Keep only last 5
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(SCAN_HISTORY_KEY);
  };

  const handleStartCamera = async () => {
    setError(null);
    setScannedResult(null);
    setScanMode('camera');

    try {
      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setScannedResult(decodedText);
          addToHistory(decodedText);
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            setScanMode('idle');
          });
        },
        (errorMessage) => {
          // Ignore frames without QR code
        }
      );
    } catch (err) {
      setScanMode('idle');
      setError('Camera access failed. Please ensure permission is granted.');
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setError(null);
    setScannedResult(null);
    setScanMode('file');

    const file = e.target.files[0];
    const html5QrCode = new Html5Qrcode('reader');

    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      setScannedResult(decodedText);
      addToHistory(decodedText);
      setScanMode('idle');
    } catch (err) {
      setError('Could not decode QR code from this image.');
      setScanMode('idle');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setScanMode('idle');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="grid md:grid-cols-12 gap-6">
      {/* LEFT COLUMN: SCANNER AREA */}
      <div className="md:col-span-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Success Banner */}
        {scannedResult && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-2 text-green-400 font-bold uppercase tracking-wider text-sm">
              <CheckCircle2 className="w-4 h-4" /> Decoded Payload
            </div>
            <div className="p-4 bg-black/30 rounded-lg border border-white/5 break-all font-mono text-white text-lg flex justify-between items-start gap-4">
              <span>{scannedResult}</span>
              <button
                onClick={() => copyToClipboard(scannedResult)}
                className="text-white/50 hover:text-white transition-colors"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {(scannedResult.startsWith('http') || scannedResult.startsWith('www')) && (
              <a
                href={scannedResult}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase text-green-400 hover:underline"
              >
                Open Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Scanner Interface */}
        <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden relative min-h-[400px] flex flex-col">
          <div
            id="reader"
            className={`w-full flex-1 bg-black ${scanMode === 'camera' ? 'block' : 'hidden'}`}
          />

          {scanMode !== 'camera' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <Scan className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Ready to Scan</h3>
                <p className="text-muted-foreground text-sm">
                  Select a method to decode a QR Matrix.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center w-full max-w-xs">
                <button
                  onClick={handleStartCamera}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold transition-all"
                >
                  <Camera className="w-4 h-4" /> Use Camera
                </button>

                <div className="relative flex-1 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 group-hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/10">
                    <ImageIcon className="w-4 h-4" /> Upload Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanMode === 'camera' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={stopCamera}
                className="px-6 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full font-bold backdrop-blur-md shadow-lg transition-all"
              >
                Stop Scanning
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: HISTORY */}
      <div className="md:col-span-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-muted-foreground text-sm uppercase">
              <History className="w-4 h-4" /> Scan History
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 uppercase font-bold"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
            {history.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground/50 text-xs italic">
                No scans yet.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="text-xs text-white/90 break-all font-mono mb-2 line-clamp-3">
                    {item.text}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(item.text)}
                        className="hover:text-primary"
                        title="Copy Text"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {(item.text.startsWith('http') || item.text.startsWith('www')) && (
                        <a
                          href={item.text}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
