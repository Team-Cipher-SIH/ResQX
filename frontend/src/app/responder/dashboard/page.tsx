'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Radio,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Send,
  LogOut,
  UserCircle,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import PulsingDot from '@/components/ui/PulsingDot';

export default function ResponderDashboardPage() {
  const router = useRouter();
  const [responderName, setResponderName] = useState('Officer');
  const [responderSector, setResponderSector] = useState('Central');
  const [dutyStatus, setDutyStatus] = useState<'available' | 'on_site' | 'en_route'>('available');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.name) setResponderName(user.name);
      if (user.district && user.state) {
        setResponderSector(`${user.district}, ${user.state}`);
      } else if (user.state) {
        setResponderSector(user.state);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Field Responder Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base font-mono tracking-tight text-white">
                ResQ<span className="text-orange-500">tech</span>
              </span>
              <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-orange-500/30">
                Field Responder
              </span>
            </div>
            <p className="text-xs text-slate-400">Mobile Tactical Dispatch Unit</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-300 font-medium">{responderSector}</span>
          </div>

          <button
            onClick={() => logout('authority')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 hover:border-red-800 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Responder Greeting & Telemetry */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <PulsingDot variant="live" size="sm" />
              <span>Live Tactical Feed Active</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {responderName}</h1>
            <p className="text-xs text-slate-400 max-w-lg">
              Stationed in {responderSector}. Standby for emergency dispatches and operational incident coordinates.
            </p>
          </div>

          {/* Status Switcher */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Readiness Status</span>
            <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDutyStatus('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'available'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('en_route')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'en_route'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                En Route
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('on_site')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'on_site'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                On Site
              </button>
            </div>
          </div>
        </div>

        {/* Operational Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Active Assignment */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Assignment</span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Standby
                </span>
              </div>
              <h3 className="font-bold text-base text-white">Sector Standby Ready</h3>
              <p className="text-xs text-slate-400 mt-1">
                No active critical dispatch currently linked to this unit ID. Mobile GPS tracking enabled.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Telemetry: <b>GPS Online</b></span>
              <span className="text-emerald-400 font-mono">100% Signal</span>
            </div>
          </div>

          {/* Card 2: Field Protocols */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Field Protocols</span>
                <span className="text-orange-400 text-xs font-mono">P0 / P1</span>
              </div>
              <h3 className="font-bold text-base text-white">Emergency Guidelines</h3>
              <p className="text-xs text-slate-400 mt-1">
                Always prioritize life evacuation, communicate status changes via telecommand, and verify triage tags.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Direct Link:</span>
              <span className="text-blue-400 font-semibold">108 Emergency Grid</span>
            </div>
          </div>

          {/* Card 3: Sector Emergency Hotline */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Command Comms</span>
                <Phone className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="font-bold text-base text-white">State Control Center</h3>
              <p className="text-xs text-slate-400 mt-1">
                For escalation and air evacuation support, connect with the jurisdictional control desk.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Emergency VoIP:</span>
              <span className="text-white font-mono font-bold">+91 112 / +91 1070</span>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Need to update your unit information?</h4>
              <p className="text-xs text-slate-400">Reach out to your District/State Administrator to modify team capabilities.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
