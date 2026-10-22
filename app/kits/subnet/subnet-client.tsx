'use client';

import { useState, useEffect } from 'react';
import { Network, Globe, Shield, Activity, Binary } from 'lucide-react';
import { renderKitIcon, getKitColor } from '@/lib/kits-registry';
import type { IconData } from '@/lib/icons/icon-data';

const STORAGE_KEY = 'my-portfolio-op1-subnet-pref'; // Key for localStorage
const DEFAULT_IP_ADDRESS = '192.168.1.1'; // Default example IP for the calculator

interface SubnetClientProps {
  iconData?: IconData | null;
  accentColor?: string;
}

export default function SubnetClient({ iconData, accentColor }: SubnetClientProps) {
  const headingColorClass = accentColor ? getKitColor(accentColor).text : 'text-primary';
  const headingIcon = renderKitIcon(iconData, <Network />, headingColorClass);

  // State - Default values act as fallbacks
  const [ip, setIp] = useState(DEFAULT_IP_ADDRESS);
  const [cidr, setCidr] = useState(24);
  const [results, setResults] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Prevents hydration mismatch

  // 1. Load Preferences on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { ip: savedIp, cidr: savedCidr } = JSON.parse(saved);
        if (savedIp) setIp(savedIp);
        if (typeof savedCidr === 'number') setCidr(savedCidr);
      }
    } catch (e) {
      console.error('Failed to load subnet preferences', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Save Preferences on Change
  useEffect(() => {
    // Only save if we have finished loading to avoid overwriting with defaults
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ip, cidr }));
      } catch (e) {
        console.warn('LocalStorage unavailable', e);
      }
    }
  }, [ip, cidr, isLoaded]);

  // 3. Core Logic: Subnet Calculation
  useEffect(() => {
    // Validate IP format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip) || cidr < 0 || cidr > 32) {
      setResults(null);
      return;
    }

    try {
      // Convert IP to Long (Binary Integer)
      const ipParts = ip.split('.').map(Number);
      if (ipParts.some((part) => part > 255 || part < 0)) return;

      // Bitwise shift to get long value (unsigned >>> 0)
      const ipLong =
        ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;

      // Generate Mask from CIDR
      const maskLong = cidr === 0 ? 0 : (-1 << (32 - cidr)) >>> 0;

      // Calculate Network & Broadcast
      const networkLong = (ipLong & maskLong) >>> 0;
      const broadcastLong = (networkLong | ~maskLong) >>> 0;

      // Calculate Usable Range
      const firstHostLong = (networkLong + 1) >>> 0;
      const lastHostLong = (broadcastLong - 1) >>> 0;

      // Total Hosts
      const totalHosts = Math.pow(2, 32 - cidr) - 2;

      // Helper to convert Long back to IP String
      const longToIp = (long: number) => {
        return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
      };

      setResults({
        networkAddress: longToIp(networkLong),
        broadcastAddress: longToIp(broadcastLong),
        subnetMask: longToIp(maskLong),
        firstHost: cidr >= 31 ? 'N/A' : longToIp(firstHostLong),
        lastHost: cidr >= 31 ? 'N/A' : longToIp(lastHostLong),
        totalHosts: cidr >= 31 ? 0 : totalHosts,
        wildcardMask: longToIp(~maskLong >>> 0),
        binaryIp: ipLong
          .toString(2)
          .padStart(32, '0')
          .match(/.{1,8}/g)
          ?.join('.'),
      });
    } catch (error) {
      console.error(error);
      setResults(null);
    }
  }, [ip, cidr]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {headingIcon} IP Subnet Calculator
        </h2>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* IP Input */}
        <div className="md:col-span-8 space-y-2">
          <label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
            <Globe className="w-3 h-3" /> IP Address
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="e.g. 192.168.1.1"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all"
          />
        </div>

        {/* CIDR Selector */}
        <div className="md:col-span-4 space-y-2">
          <label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
            <Activity className="w-3 h-3" /> CIDR / Prefix
          </label>
          <select
            value={cidr}
            onChange={(e) => setCidr(Number(e.target.value))}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-lg text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all appearance-none"
          >
            {Array.from({ length: 33 }).map((_, i) => (
              <option key={i} value={i} className="bg-zinc-900">
                /{i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Display */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2 text-primary">
                <Network className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Network Address</span>
              </div>
              <div className="text-2xl md:text-3xl font-mono font-bold text-white">
                {results.networkAddress}
                <span className="text-muted-foreground text-lg">/{cidr}</span>
              </div>
            </div>

            <div className="p-6 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Subnet Mask</span>
              </div>
              <div className="text-2xl md:text-3xl font-mono font-bold text-white/80">
                {results.subnetMask}
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="First Host" value={results.firstHost} />
            <StatBox label="Last Host" value={results.lastHost} />
            <StatBox label="Broadcast Address" value={results.broadcastAddress} highlight />
            <StatBox label="Usable Hosts" value={results.totalHosts.toLocaleString()} />
          </div>

          {/* Binary Visualization (Hacker aesthetic) */}
          <div className="p-4 rounded-lg bg-black/40 border border-white/5 font-mono text-xs md:text-sm text-muted-foreground overflow-x-auto">
            <div className="flex items-center gap-2 mb-2 text-primary/70">
              <Binary className="w-4 h-4" /> Binary Representation
            </div>
            <div>{results.binaryIp}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable component for this page
const StatBox = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div
    className={`p-4 rounded-xl border transition-colors cursor-default ${
      highlight
        ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
        : 'bg-white/5 border-white/5 hover:bg-white/10'
    }`}
  >
    <div
      className={`text-lg font-bold font-mono truncate ${highlight ? 'text-red-400' : 'text-white'}`}
    >
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wider font-medium">
      {label}
    </div>
  </div>
);
