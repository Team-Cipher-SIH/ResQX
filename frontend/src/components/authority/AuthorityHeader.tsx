'use client';

import { useState, useEffect } from 'react';
import { Clock, Radio } from 'lucide-react';
import { JurisdictionBadge } from './Badges';

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
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900">
              {title || 'Authority Command Center'}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            <JurisdictionBadge level={authorityLevel} state={state} district={district} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
