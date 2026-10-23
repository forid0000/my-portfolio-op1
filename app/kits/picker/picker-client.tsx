'use client';

import { useState, useEffect } from 'react';
import { Dices, Coins, Hash, List, Shuffle, Trophy } from 'lucide-react';

// --- Storage Keys ---
import { getSecureRandom, getSecureRandomInt, pickSecureRandom } from '@/lib/crypto-utils';
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';
import type { IconData } from '@/lib/icons/icon-data';

const STORAGE_KEY_NUMBER = 'my-portfolio-op1-picker-number';
const STORAGE_KEY_LIST = 'my-portfolio-op1-picker-list';

type Tab = 'coin' | 'number' | 'list';

interface PickerClientProps {
  iconData?: IconData | null;
  accentColor?: string;
}

export default function PickerClient({ iconData, accentColor }: PickerClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('coin');
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(iconData, <Dices />, headingColorClass);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {headingIcon} Randomizer Suite
        </h2>

        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-foreground/5 p-1 rounded-lg border border-foreground/10 gap-1">
          {[
            { id: 'coin', label: 'Coin Flip', icon: Coins },
            { id: 'number', label: 'RNG', icon: Hash },
            { id: 'list', label: 'Wheel', icon: List },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <tab.icon className="w-3 h-3 md:w-4 md:h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'coin' && <CoinView />}
        {activeTab === 'number' && <NumberView />}
        {activeTab === 'list' && <ListView />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. ULTRA 3D COIN FLIPPER                                                   */
/* -------------------------------------------------------------------------- */

function CoinView() {
  const [result, setResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);

  const flip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setResult(null);

    // Determine outcome immediately but show it after animation
    const outcome = getSecureRandom() < 0.5 ? 'HEADS' : 'TAILS';

    // Calculate new rotation:
    // We want to spin at least 5 times (1800 degrees) + landing position
    // If current is 0, we go to 1800 (Heads) or 1980 (Tails)
    const spins = 5;
    const baseRotation = rotation + 360 * spins;
    const targetRotation =
      outcome === 'HEADS'
        ? baseRotation + (rotation % 360 === 0 ? 0 : 180) // Land on 0/360
        : baseRotation + (rotation % 360 === 0 ? 180 : 0); // Land on 180

    // Force Heads to be even multiples of 360, Tails to be odd multiples of 180
    // Actually simpler:
    // HEADS = k * 360
    // TAILS = k * 360 + 180
    // let's just add huge rotation
    const nextRotation =
      rotation + 1800 + (outcome === 'HEADS' ? 360 - (rotation % 360) : 540 - (rotation % 360));

    setRotation(nextRotation);

    setTimeout(() => {
      setResult(outcome);
      setIsFlipping(false);
    }, 2000); // Animation duration
  };

  return (
    <div className="max-w-xl mx-auto text-center space-y-16 py-12 perspective-[1200px]">
      {/* 3D Scene Container */}
      <div className="relative w-64 h-64 mx-auto preserve-3d">
        {/* The Coin Object */}
        <div
          className="w-full h-full absolute transform-style-3d transition-all duration-[2000ms] ease-out-cubic"
          style={{
            transform: `rotateX(${rotation}deg)`,
            // Adding a slight tilt for realism during idle
            rotate: isFlipping ? '0deg' : 'y 10deg',
          }}
        >
          {/* FRONT FACE (HEADS) */}
          <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-warning via-warning to-warning border-[12px] border-warning shadow-inner flex items-center justify-center">
            {/* Decorative rings */}
            <div className="absolute inset-2 border-2 border-warning/50 rounded-full border-dashed opacity-50"></div>
            <div className="text-4xl font-black text-warning drop-shadow-md tracking-wider">
              HEADS
            </div>
            {/* Shine effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-foreground/30 to-transparent rounded-full"></div>
          </div>

          {/* BACK FACE (TAILS) */}
          <div
            className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-foreground/70 via-muted to-foreground/30 border-[12px] border-border shadow-inner flex items-center justify-center"
            style={{ transform: 'rotateX(180deg)' }}
          >
            <div className="absolute inset-2 border-2 border-foreground/20 rounded-full opacity-50"></div>
            <div className="text-4xl font-black text-foreground drop-shadow-md tracking-wider">
              TAILS
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-foreground/20 to-transparent rounded-full"></div>
          </div>

          {/* EDGE (Approximated for performance) */}
          {/* CSS 3D typically creates flat planes. To make it look "thick", we can layer a few disks behind, but for a flipper, two faces is cleaner/faster. */}
        </div>

        {/* Dynamic Shadow */}
        <div
          className={`absolute -bottom-24 left-1/2 -translate-x-1/2 bg-scrim/60 blur-2xl rounded-[100%] transition-all duration-[2000ms] ease-in-out-sine ${
            isFlipping ? 'w-24 h-4 opacity-30 delay-200' : 'w-48 h-8 opacity-80'
          }`}
        />
      </div>

      <div className="space-y-4">
        <div
          className={`text-2xl font-bold tracking-widest transition-all duration-500 ${result ? 'text-foreground scale-110' : 'text-transparent scale-90'}`}
        >
          {result || '...'}
        </div>

        <button
          onClick={flip}
          disabled={isFlipping}
          className="px-16 py-5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-xl rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_color-mix(in_srgb,var(--primary)_30%,transparent)] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
        >
          {isFlipping ? 'Tossing...' : 'FLIP COIN'}
        </button>
      </div>

      {/* Styles for 3D helpers */}
      <style jsx global>{`
        .perspective-1200 {
          perspective: 1200px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        /* Custom Easing for realistic gravity feel */
        .ease-out-cubic {
          transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
        }
        .ease-in-out-sine {
          transition-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. NUMBER GENERATOR                                                        */
/* -------------------------------------------------------------------------- */

function NumberView() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  // Load Preferences
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_NUMBER);
    if (saved) {
      const { min: sMin, max: sMax } = JSON.parse(saved);
      if (sMin !== undefined) setMin(sMin);
      if (sMax !== undefined) setMax(sMax);
    }
  }, []);

  // Save Preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NUMBER, JSON.stringify({ min, max }));
  }, [min, max]);

  const generate = () => {
    // Inclusive range
    const val = getSecureRandomInt(min, max);
    setResult(val);
    setHistory((prev) => [val, ...prev].slice(0, 10)); // Keep last 10
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="p-6 bg-foreground/5 border border-foreground/10 rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-muted-foreground">Minimum</label>
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              className="w-full bg-scrim/40 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-primary outline-none font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-muted-foreground">Maximum</label>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              className="w-full bg-scrim/40 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-primary outline-none font-mono"
            />
          </div>
          <button
            onClick={generate}
            className="w-full py-4 mt-4 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" /> Generate Number
          </button>
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase font-bold text-muted-foreground">Recent Picks</div>
            <div className="flex flex-wrap gap-2">
              {history.map((num, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-foreground/5 rounded-full text-xs font-mono text-foreground/70 border border-foreground/5"
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Display */}
      <div className="flex items-center justify-center bg-scrim/20 border border-foreground/10 rounded-xl min-h-[300px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        {result !== null ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="text-8xl font-bold font-mono text-primary drop-shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_50%,transparent)]">
              {result}
            </div>
            <div className="text-sm text-muted-foreground mt-4 uppercase tracking-widest">
              Generated Result
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm uppercase tracking-widest flex items-center gap-2">
            <Hash className="w-4 h-4" /> Waiting for Input
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. LIST PICKER (WHEEL)                                                     */
/* -------------------------------------------------------------------------- */

function ListView() {
  const [items, setItems] = useState('');
  const [winner, setWinner] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Load Items
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LIST);
    if (saved) setItems(saved);
  }, []);

  // Save Items
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LIST, items);
  }, [items]);

  const pickWinner = () => {
    const list = items.split('\n').filter((line) => line.trim() !== '');
    if (list.length === 0) return;

    setIsRolling(true);
    setWinner(null);

    // "Drum roll" effect
    let steps = 0;
    const maxSteps = 20;
    const interval = setInterval(() => {
      setWinner(pickSecureRandom(list));
      steps++;
      if (steps >= maxSteps) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 100);
  };

  const count = items.split('\n').filter((line) => line.trim() !== '').length;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
            <List className="w-3 h-3" /> Entrants (One per line)
          </label>
          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            {count} items
          </span>
        </div>
        <textarea
          value={items}
          onChange={(e) => setItems(e.target.value)}
          placeholder={'Imran\nHassan\nFaisal\nNoman\nSaad'}
          className="flex-1 min-h-[250px] w-full bg-scrim/40 border border-foreground/10 rounded-lg p-4 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono resize-none leading-relaxed whitespace-pre-wrap"
        />
        <button
          onClick={pickWinner}
          disabled={isRolling || count < 2}
          className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4" /> {isRolling ? 'Picking...' : 'Pick a Winner'}
        </button>
      </div>

      <div className="flex items-center justify-center bg-gradient-to-br from-foreground/5 to-transparent border border-foreground/10 rounded-xl min-h-[300px] relative overflow-hidden">
        {winner ? (
          <div className="text-center p-8 max-w-full">
            <div
              className={`text-sm text-muted-foreground uppercase tracking-widest mb-4 ${isRolling ? 'animate-pulse' : ''}`}
            >
              {isRolling ? 'Rolling...' : 'The Winner Is'}
            </div>
            <div
              className={`text-3xl md:text-5xl font-bold text-foreground break-words ${isRolling ? 'blur-sm' : 'animate-in zoom-in duration-300'}`}
            >
              {winner}
            </div>
            {!isRolling && (
              <div className="mt-8 flex justify-center">
                <div className="bg-warning/20 text-warning p-3 rounded-full border border-warning/50 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-bounce">
                  <Trophy className="w-8 h-8" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <div className="mb-4 flex justify-center opacity-20">
              <List className="w-16 h-16" />
            </div>
            <p className="text-sm uppercase tracking-wider">Add items to the list to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
