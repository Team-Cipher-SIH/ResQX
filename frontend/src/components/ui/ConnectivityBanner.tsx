'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export default function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce-in max-w-sm">
      {!isOnline ? (
        <div className="bg-slate-900/95 text-white border border-amber-500/40 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-amber-400">Offline Operational Mode</p>
            <p className="text-slate-300 text-[11px] leading-tight mt-0.5">
              Network disconnected. Utilizing local cached data. Actions will queue for sync.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/95 text-white border border-emerald-500/40 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-emerald-400">Connection Restored</p>
            <p className="text-slate-300 text-[11px] leading-tight mt-0.5">
              Live command network synchronized successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
