import Link from 'next/link';
import { AlertTriangle, PhoneCall, ArrowRight } from 'lucide-react';

export default function EmergencyCTA() {
  return (
    <section className="bg-gradient-to-r from-red-50 via-slate-50 to-blue-50 py-16 border-y border-red-200 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white border border-red-200 rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Text */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5 animate-gentle-pulse" />
              <span>IMMEDIATE ASSISTANCE PROTOCOL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Facing an Emergency?
            </h2>
            <p className="text-slate-600 text-base max-w-xl">
              Report the situation and help authorities respond faster. Every second saved improves disaster mitigation and life safety.
            </p>
          </div>

          {/* Right Action & Phone Contacts */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full lg:w-auto">
            <Link
              href="/citizen/login"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-md shadow-red-600/20 border border-red-500 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-red-600/25 active:scale-[0.99]"
            >
              <span>Report a Disaster</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs shadow-sm">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Helpline: 112 / 108</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
