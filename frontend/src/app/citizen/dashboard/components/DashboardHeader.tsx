'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Radio, HeartHandshake, MapPin, FileText } from 'lucide-react';
import { clearStoredTokens } from '@/lib/api';

export default function DashboardHeader() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Citizen');

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem('resqtech_user_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) setUserName(parsed.name);
        }
      } catch {
        // ignore JSON parse error
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    clearStoredTokens();
    router.push('/citizen/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-mono">
                ResQ<span className="text-blue-600">tech</span>
              </span>
            </div>
          </Link>

          <span className="text-slate-300">|</span>

          <div>
            <h1 className="text-sm font-bold text-slate-900">Citizen Command Portal</h1>
            <p className="text-[11px] text-slate-500">Live disaster response & aid network</p>
          </div>
        </div>

        {/* Quick Jump Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600">
          <a href="#emergency-alerts" className="hover:text-emerald-600 transition flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            Alerts
          </a>
          <a href="#my-incidents" className="hover:text-emerald-600 transition flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            My Reports
          </a>
          <a href="#relief-camps" className="hover:text-emerald-600 transition flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Shelters
          </a>
          <a href="#community-help" className="hover:text-emerald-600 transition flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" />
            Community Aid
          </a>
        </nav>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <a
            href="#profile-card"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 hover:bg-slate-100 transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 font-bold text-xs text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline max-w-[120px] truncate">
              {userName}
            </span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out of citizen portal"
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
