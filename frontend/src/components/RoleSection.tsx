import Link from 'next/link';
import { MOCK_ROLE_CITIZEN, MOCK_ROLE_AUTHORITY } from '@/data/mockData';
import { UserCheck, ShieldAlert, CheckCircle2, ArrowRight, Lock, Users } from 'lucide-react';

export default function RoleSection() {
  return (
    <section className="bg-white py-20 border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-blue-600">
            <span>ROLE-BASED ACCESS PROTOCOL</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tailored Interfaces for Citizens & Authorities
          </h2>
          <p className="text-slate-600 text-base">
            Engineered with distinct permissions, dedicated tools, and streamlined user experiences for each stakeholder group.
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CITIZEN CARD */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-emerald-200 p-8 shadow-md relative overflow-hidden flex flex-col justify-between group hover:border-emerald-400 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition">
              <Users className="w-32 h-32 text-emerald-600" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {MOCK_ROLE_CITIZEN.title}
                    </h3>
                    <p className="text-xs text-emerald-700 font-mono font-bold">
                      {MOCK_ROLE_CITIZEN.tagline}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold">
                  {MOCK_ROLE_CITIZEN.badge}
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-6 pb-4 border-b border-slate-200">
                Designed for speed, clarity, and simplicity during high-stress emergency situations.
              </p>

              {/* Capabilities List */}
              <div className="space-y-3 mb-8">
                {MOCK_ROLE_CITIZEN.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{cap.title}</h4>
                      <p className="text-xs text-slate-600">{cap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-6 border-t border-slate-200">
              <Link
                href={MOCK_ROLE_CITIZEN.ctaRoute}
                className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/10 transition-all"
              >
                <span>{MOCK_ROLE_CITIZEN.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* AUTHORITY CARD */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-blue-200 p-8 shadow-md relative overflow-hidden flex flex-col justify-between group hover:border-blue-400 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition">
              <ShieldAlert className="w-32 h-32 text-blue-600" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {MOCK_ROLE_AUTHORITY.title}
                    </h3>
                    <p className="text-xs text-blue-700 font-mono font-bold">
                      {MOCK_ROLE_AUTHORITY.tagline}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-blue-600" />
                  <span>{MOCK_ROLE_AUTHORITY.badge}</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-6 pb-4 border-b border-slate-200">
                Empowers emergency officers with live analytics, resource management, and team dispatch control.
              </p>

              {/* Capabilities List */}
              <div className="space-y-3 mb-8">
                {MOCK_ROLE_AUTHORITY.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{cap.title}</h4>
                      <p className="text-xs text-slate-600">{cap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-6 border-t border-slate-200">
              <Link
                href={MOCK_ROLE_AUTHORITY.ctaRoute}
                className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/10 transition-all"
              >
                <span>{MOCK_ROLE_AUTHORITY.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
