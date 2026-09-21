'use client';

import { useState, useEffect } from 'react';
import { Clock, Radio } from 'lucide-react';
import { JurisdictionBadge } from './Badges';
import PulsingDot from '@/components/ui/PulsingDot';

export default function AuthorityHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [currentTime, setCurrentTime] = useState('');
  const [userName, setUserName] = useState('Officer');
  const [authorityLevel, setAuthorityLevel] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('resqtech_user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.authorityLevel) setAuthorityLevel(parsed.authorityLevel);
        if (parsed.state) setState(parsed.state);
        if (parsed.district) setDistrict(parsed.district);
      }
    } catch {
      // ignore
    }

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200/90 px-6 py-4 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {title || 'Authority Command Center'}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-2xs">
              <PulsingDot variant="live" size="sm" />
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
            <JurisdictionBadge level={authorityLevel} state={state} district={district} />
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-mono font-bold text-slate-800">{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

