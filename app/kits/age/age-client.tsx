'use client';

import { useState, useEffect } from 'react';
import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  differenceInHours,
  format,
  isValid,
  parseISO,
} from 'date-fns';
import { Hourglass, Calendar, ArrowDown, RotateCcw } from 'lucide-react';
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';

const STORAGE_KEY = 'global-id-age-pref'; // Key for localStorage

interface AgeClientProps {
  icon?: string;
  accentColor?: string;
}

export default function AgeClient({ icon, accentColor }: AgeClientProps) {
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(icon, <Hourglass />, headingColorClass);

  // State
  const [dob, setDob] = useState('');
  // Always default target date to today's date formatted as YYYY-MM-DD
  const [targetDate, setTargetDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Prevents hydration mismatch

  // 1. Load Preferences on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { dob: savedDob } = JSON.parse(saved);
        if (savedDob) setDob(savedDob);
        // Always keep target date as current date, don't load from localStorage
      }
    } catch (e) {
      console.error('Failed to load age preferences', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Save Preferences on Change
  useEffect(() => {
    // Only save DOB, don't save targetDate as it should always default to today
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dob }));
      } catch (e) {
        console.warn('LocalStorage unavailable', e);
      }
    }
  }, [dob, isLoaded]);

  // Calculation Effect - Runs whenever dob or targetDate changes
  useEffect(() => {
    if (!dob || !targetDate) {
      setStats(null);
      return;
    }

    const birth = parseISO(dob);
    const target = parseISO(targetDate);

    // Validate dates
    if (!isValid(birth) || !isValid(target)) return;

    // Ensure target is after birth to avoid negative calculations
    if (target < birth) {
      setStats('error'); // Simple flag to show error state
      return;
    }

    // Core Calculation Logic
    const years = differenceInYears(target, birth);
    const months = differenceInMonths(target, birth);
    const days = differenceInDays(target, birth);
    const hours = differenceInHours(target, birth);

    // Detailed Breakdown (Years -> Remaining Months -> Remaining Days)
    let tempDate = new Date(birth);
    tempDate.setFullYear(tempDate.getFullYear() + years);
    const extraMonths = differenceInMonths(target, tempDate);

    tempDate.setMonth(tempDate.getMonth() + extraMonths);
    const extraDays = differenceInDays(target, tempDate);

    setStats({
      full: { years, months: extraMonths, days: extraDays },
      total: { months, days, hours },
    });
  }, [dob, targetDate]);

  const handleResetTarget = () => {
    setTargetDate(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">{headingIcon} Age Calculator</h2>
        {stats === 'error' && (
          <span className="text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
            Birth date cannot be in the future relative to Target
          </span>
        )}
      </div>

      <div className="info-card grid md:grid-cols-2 gap-6 relative">
        {/* Input 1: Birth Date */}
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Date of Birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg text-white appearance-none focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all"
          />
        </div>

        {/* Decorator Arrow (Desktop Only) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground">
          <ArrowDown className="w-4 h-4 -rotate-90" />
        </div>

        {/* Input 2: Compare To Date */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
              Compare To
            </label>
            <button
              onClick={handleResetTarget}
              title="Reset to Today"
              className="text-[10px] flex items-center gap-1 text-primary hover:text-primary/80 transition-colors uppercase font-bold tracking-wider"
            >
              <RotateCcw className="w-3 h-3" /> Today
            </button>
          </div>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg text-white appearance-none focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Results Section */}
      {stats && stats !== 'error' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Age Display */}
          <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="text-sm text-primary font-bold uppercase tracking-widest mb-4">
              Time Elapsed
            </div>

            <div className="flex flex-wrap justify-center items-baseline gap-3 md:gap-6 text-white mb-2">
              <div className="text-center">
                <span className="text-4xl md:text-6xl font-bold tracking-tighter">
                  {stats.full.years}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground uppercase font-bold ml-1 block">
                  Years
                </span>
              </div>
              <div className="text-center">
                <span className="text-4xl md:text-6xl font-bold tracking-tighter text-white/80">
                  {stats.full.months}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground uppercase font-bold ml-1 block">
                  Months
                </span>
              </div>
              <div className="text-center">
                <span className="text-4xl md:text-6xl font-bold tracking-tighter text-white/60">
                  {stats.full.days}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground uppercase font-bold ml-1 block">
                  Days
                </span>
              </div>
            </div>
          </div>

          {/* Grid Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox
              label="Total Months"
              value={stats.total.months.toLocaleString()}
              delay="delay-75"
            />
            <StatBox
              label="Total Days"
              value={stats.total.days.toLocaleString()}
              delay="delay-100"
            />
            <StatBox
              label="Total Hours"
              value={stats.total.hours.toLocaleString()}
              delay="delay-150"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!stats && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
          Select your birth date above to calculate precise age.
        </div>
      )}
    </div>
  );
}

const StatBox = ({ label, value, delay }: { label: string; value: string; delay?: string }) => (
  <div
    className={`bg-white/5 p-5 rounded-xl border border-white/5 text-center hover:bg-white/10 transition-colors cursor-default animate-in fade-in fill-mode-backwards ${delay}`}
  >
    <div className="text-2xl md:text-3xl font-bold font-mono text-primary/90">{value}</div>
    <div className="text-[10px] md:text-xs text-muted-foreground uppercase mt-2 tracking-wider font-medium">
      {label}
    </div>
  </div>
);
