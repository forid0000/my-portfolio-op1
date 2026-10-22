'use client';

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, ShieldCheck, Check, Keyboard, Dices, WholeWord } from 'lucide-react';
import { toast } from 'sonner';
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';
import type { IconData } from '@/lib/icons/icon-data';

interface PasswordClientProps {
  iconData?: IconData | null;
  accentColor?: string;
}

export default function PasswordClient({ iconData, accentColor }: PasswordClientProps) {
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(iconData, <ShieldCheck />, headingColorClass);

  const [mode, setMode] = useState<'random' | 'passphrase' | 'analyze'>('random');
  const [output, setOutput] = useState('');

  // Random String State
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });

  // Passphrase State
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalize, setCapitalize] = useState(false);

  // Common State
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState(0);
  const [mounted, setMounted] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('genpass-prefs-v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.mode) setMode(data.mode);
        if (data.length) setLength(data.length);
        if (data.options) setOptions(data.options);
        if (data.wordCount) setWordCount(data.wordCount);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'genpass-prefs-v2',
        JSON.stringify({ mode, length, options, wordCount })
      );
    }
  }, [mode, length, options, wordCount, mounted]);

  // --- Logic ---
  const generate = () => {
    if (mode === 'analyze') return;

    if (mode === 'passphrase') {
      // Simple built-in dictionary for offline capability
      const words = [
        'alpha',
        'bravo',
        'charlie',
        'delta',
        'echo',
        'foxtrot',
        'golf',
        'hotel',
        'india',
        'juliet',
        'kilo',
        'lima',
        'mike',
        'november',
        'oscar',
        'papa',
        'quebec',
        'romeo',
        'sierra',
        'tango',
        'uniform',
        'victor',
        'whiskey',
        'xray',
        'yankee',
        'zulu',
        'north',
        'south',
        'east',
        'west',
        'blue',
        'red',
        'green',
        'yellow',
        'purple',
        'orange',
        'black',
        'white',
        'space',
        'sky',
        'ocean',
        'river',
        'mountain',
        'forest',
        'desert',
        'rain',
        'storm',
        'snow',
        'wind',
        'fire',
        'earth',
        'moon',
        'star',
        'sun',
        'planet',
        'comet',
        'galaxy',
        'nebula',
        'atom',
        'quantum',
        'cyber',
        'code',
        'data',
        'node',
        'grid',
        'link',
        'base',
        'core',
        'system',
        'logic',
        'power',
        'energy',
        'force',
        'wave',
        'sound',
        'light',
        'sonic',
        'ultra',
        'mega',
        'giga',
        'terra',
        'nano',
        'pixel',
        'vector',
        'matrix',
        'vertex',
        'shader',
        'render',
        'buffer',
        'cache',
        'stack',
        'queue',
        'heap',
        'tree',
        'graph',
        'eagle',
        'tiger',
        'shark',
        'wolf',
        'bear',
        'hawk',
        'falcon',
        'snake',
        'cobra',
        'viper',
        'dragon',
        'phoenix',
        'titan',
        'atlas',
      ];

      let phrase = [];
      for (let i = 0; i < wordCount; i++) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const randomFraction = array[0] / (0xffffffff + 1);
        let word = words[Math.floor(randomFraction * words.length)];
        if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
        phrase.push(word);
      }
      const result = phrase.join(separator);
      setOutput(result);
      calculateStrength(result);
    } else {
      // Random String
      const chars = {
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lower: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
      };

      let charset = '';
      if (options.upper) charset += chars.upper;
      if (options.lower) charset += chars.lower;
      if (options.numbers) charset += chars.numbers;
      if (options.symbols) charset += chars.symbols;
      if (charset === '') return;

      let generated = '';
      for (let i = 0; i < length; i++) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const randomFraction = array[0] / (0xffffffff + 1);
        generated += charset.charAt(Math.floor(randomFraction * charset.length));
      }
      setOutput(generated);
      calculateStrength(generated);
    }
  };

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) {
      setStrength(0);
      return;
    }

    if (mode === 'passphrase') {
      // Passphrase logic: length + word count
      score = 2; // Baseline
      if (pass.length > 15) score++;
      if (pass.length > 25) score++;
      if (/[0-9]/.test(pass) || /[^a-zA-Z0-9]/.test(pass)) score++; // Special separator
      if (/[A-Z]/.test(pass)) score++; // Capitalization
    } else {
      // Standard entropy logic
      if (pass.length > 8) score++;
      if (pass.length > 12) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/[0-9]/.test(pass)) score++;
      if (/[^A-Za-z0-9]/.test(pass)) score++;
      if (pass.length > 20) score = Math.min(score + 1, 5);
    }
    setStrength(Math.min(score, 6));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Password copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy password');
    }
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOutput(val);
    calculateStrength(val);
  };

  // Initial Generate
  useEffect(() => {
    if (mounted && mode !== 'analyze') generate();
  }, [mode, mounted, length, options, wordCount, separator, capitalize]);

  if (!mounted) return null;

  const strengthColor = [
    'bg-white/5',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
  ];
  const strengthText = ['Empty', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Unbreakable'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {headingIcon} GenPass{' '}
          <span className="text-sm font-normal text-muted-foreground hidden sm:inline">
            | Security Suite
          </span>
        </h2>

        {/* Mode Switcher */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 w-full lg:w-auto overflow-x-auto">
          <Tab
            active={mode === 'random'}
            onClick={() => setMode('random')}
            icon={<Dices className="w-4 h-4" />}
            label="Random"
          />
          <Tab
            active={mode === 'passphrase'}
            onClick={() => setMode('passphrase')}
            icon={<WholeWord className="w-4 h-4" />}
            label="Passphrase"
          />
          <Tab
            active={mode === 'analyze'}
            onClick={() => {
              setMode('analyze');
              setOutput('');
              setStrength(0);
            }}
            icon={<Keyboard className="w-4 h-4" />}
            label="Analyzer"
          />
        </div>
      </div>

      <div className="info-card space-y-8 min-h-[400px]">
        {/* Output Display */}
        <div className="relative group">
          {mode === 'analyze' ? (
            <input
              type="text"
              value={output}
              onChange={handleManualInput}
              placeholder="Type to analyze..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-6 text-center font-mono text-xl md:text-3xl tracking-tight text-primary shadow-inner min-h-[6rem] focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none placeholder:text-white/10"
              autoFocus
            />
          ) : (
            <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center break-all font-mono text-xl md:text-3xl tracking-tight text-primary shadow-inner min-h-[6rem] flex items-center justify-center">
              {output}
            </div>
          )}

          <div className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-2">
            {mode !== 'analyze' && (
              <button
                onClick={generate}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            {output && (
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg text-white transition-all duration-300 ${copied ? 'bg-green-500' : 'bg-primary hover:bg-primary/80 opacity-0 group-hover:opacity-100'}`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Strength Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs uppercase font-bold text-muted-foreground">
            <span>Security Level</span>
            <span
              className={strength >= 5 ? 'text-emerald-400' : strength >= 3 ? 'text-primary' : ''}
            >
              {strengthText[strength]}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${strengthColor[strength]}`}
              style={{ width: `${(Math.max(strength, 0) / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* CONTROLS */}
        <div className="pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2">
          {/* 1. RANDOM MODE CONTROLS */}
          {mode === 'random' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold uppercase text-muted-foreground">
                    Length
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="128"
                    value={length}
                    onChange={(e) =>
                      setLength(Math.min(128, Math.max(4, parseInt(e.target.value) || 0)))
                    }
                    className="w-16 bg-black/20 border border-white/10 rounded px-2 py-1 text-right font-mono text-primary focus:border-primary outline-none"
                  />
                </div>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Toggle
                  label="A-Z"
                  checked={options.upper}
                  onChange={() => setOptions({ ...options, upper: !options.upper })}
                />
                <Toggle
                  label="a-z"
                  checked={options.lower}
                  onChange={() => setOptions({ ...options, lower: !options.lower })}
                />
                <Toggle
                  label="0-9"
                  checked={options.numbers}
                  onChange={() => setOptions({ ...options, numbers: !options.numbers })}
                />
                <Toggle
                  label="Symbols"
                  checked={options.symbols}
                  onChange={() => setOptions({ ...options, symbols: !options.symbols })}
                />
              </div>
            </div>
          )}

          {/* 2. PASSPHRASE MODE CONTROLS */}
          {mode === 'passphrase' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold uppercase text-muted-foreground">
                    Word Count
                  </label>
                  <span className="text-xl font-mono text-primary font-bold">{wordCount}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Toggle
                  label="Capitalize"
                  checked={capitalize}
                  onChange={() => setCapitalize(!capitalize)}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Separator
                  </label>
                  <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                    {['-', '_', '.', ' '].map((sep) => (
                      <button
                        key={sep === ' ' ? 'space' : sep}
                        onClick={() => setSeparator(sep)}
                        className={`flex-1 py-1 rounded text-sm font-mono font-bold transition-all ${separator === sep ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/5'}`}
                      >
                        {sep === ' ' ? 'SPC' : sep}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ANALYZE MODE INFO */}
          {mode === 'analyze' && (
            <div className="text-center text-muted-foreground text-sm">
              Type a password above to check its entropy. Analysis happens entirely in your browser.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Tab = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${active ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const Toggle = ({ label, checked, onChange }: any) => (
  <button
    onClick={onChange}
    className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold uppercase transition-all ${checked ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'}`}
  >
    {label}
    <div
      className={`w-3 h-3 rounded-full border ${checked ? 'bg-primary border-primary' : 'border-white/30'}`}
    />
  </button>
);
