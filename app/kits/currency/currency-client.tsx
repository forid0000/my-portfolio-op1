'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';
import type { IconData } from '@/lib/icons/icon-data';

const STORAGE_KEY = 'my-portfolio-op1-currency-pref'; // Key for localStorage

interface CurrencyClientProps {
  iconData?: IconData | null;
  accentColor?: string;
}

export default function CurrencyClient({ iconData, accentColor }: CurrencyClientProps) {
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(iconData, <TrendingUp />, headingColorClass);

  // Store amount as string to allow typing decimals (e.g., "10.") without it snapping back to "10"
  const [amountStr, setAmountStr] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');

  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [isLoaded, setIsLoaded] = useState(false); // Prevents hydration mismatch

  // Store available currency codes dynamically
  const [currencyList, setCurrencyList] = useState<string[]>([
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'INR',
    'AUD',
    'CAD',
    'CHF',
    'SGD',
    'AED',
  ]);

  // 1. Load Preferences on Mount (Including Amount)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { from: savedFrom, to: savedTo, amount: savedAmount } = JSON.parse(saved);
        if (savedFrom) setFrom(savedFrom);
        if (savedTo) setTo(savedTo);
        // Load the saved amount if it exists
        if (savedAmount) setAmountStr(savedAmount);
      }
    } catch (e) {
      console.error('Failed to load currency preferences', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Save Preferences on Change (Including Amount)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ from, to, amount: amountStr }));
      } catch (e) {
        console.warn('LocalStorage unavailable', e);
      }
    }
  }, [from, to, amountStr, isLoaded]);

  // 3. Fetch Available Currencies on Mount
  useEffect(() => {
    const initCurrencies = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates) {
          const codes = Object.keys(data.rates).sort();
          setCurrencyList(codes);
        }
      } catch (e) {
        console.error('Failed to load currency list, using fallback.');
      }
    };
    initCurrencies();
  }, []);

  // 4. Fetch Exchange Rate
  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await res.json();

        if (data.result === 'error') {
          throw new Error('API Error');
        }

        // Verify the 'to' currency exists in the new data
        if (data.rates && data.rates[to]) {
          setRate(data.rates[to]);
          setLastUpdate(data.time_last_update_utc);
        } else {
          setRate(null);
          setError(`Currency ${to} not available.`);
        }
      } catch (error) {
        console.error('Failed to fetch rates');
        setError('Failed to fetch exchange rates.');
        setRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [from, to]);

  // Calculate Result
  const parsedAmount = parseFloat(amountStr) || 0;
  const convertedAmount = rate
    ? (parsedAmount * rate).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '---';

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        {headingIcon} Currency Converter
      </h2>

      <div className="info-card border-primary/20 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
        {/* Error Message */}
        {error && (
          <div className="absolute top-0 left-0 w-full bg-red-500/10 text-red-400 text-xs py-1 px-4 flex items-center gap-2 border-b border-red-500/20">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}

        {/* Input Section */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8 pt-4">
          {/* From */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold pl-1">From</label>
            <div className="relative">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg font-mono focus:border-primary outline-none appearance-none cursor-pointer"
              >
                {currencyList.map((c) => (
                  <option key={c} value={c} className="bg-zinc-950 text-white">
                    {c}
                  </option>
                ))}
              </select>
              {/* Custom Arrow */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <span className="text-[10px]">▼</span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className="mt-6 p-3 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/30 transition-all duration-300 group"
            title="Swap Currencies"
          >
            <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          </button>

          {/* To */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold pl-1">To</label>
            <div className="relative">
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg font-mono focus:border-primary outline-none appearance-none cursor-pointer"
              >
                {currencyList.map((c) => (
                  <option key={c} value={c} className="bg-zinc-950 text-white">
                    {c}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <span className="text-[10px]">▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2 mb-8 relative z-10">
          <label className="text-xs uppercase text-muted-foreground font-bold pl-1">Amount</label>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-3xl font-bold text-center focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-white/10"
            placeholder="0.00"
          />
        </div>

        {/* Result */}
        <div className="text-center p-8 bg-primary/5 rounded-xl border border-primary/10 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] z-20 rounded-xl">
              <RefreshCw className="animate-spin text-primary w-6 h-6" />
            </div>
          )}

          <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Converted Amount
          </div>

          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-4xl md:text-5xl font-bold text-primary font-mono tracking-tight break-all">
              {convertedAmount}
            </div>
            <div className="text-lg font-bold text-white/50">{to}</div>
          </div>

          <div className="text-xs text-muted-foreground mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-2">
            <span>
              1 {from} = {rate ? rate.toFixed(4) : '...'} {to}
            </span>
            <span className="text-muted-foreground/70">
              Last Update:{' '}
              {lastUpdate
                ? new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'UTC',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  }).format(new Date(lastUpdate)) + ' UTC'
                : 'Syncing...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
