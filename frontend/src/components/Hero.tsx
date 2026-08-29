import Link from 'next/link';
import {
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

import LiveDisasterMap from '@/components/LiveDisasterMap';
import SpecularButton from '@/components/Reactbits/SpecularButton';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 pt-12 pb-20 lg:pt-20 lg:pb-28">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[350px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">

          {/* ==================================================
              LEFT COLUMN
          =================================================== */}
          <div className="space-y-8 text-center lg:col-span-7 lg:text-left">

            {/* Mission Badge */}
            <div className="animate-fade-in-up inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">

              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>

              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-600">
                Detect. Respond. Protect.
              </span>

              <span className="text-slate-300">|</span>

              <span className="font-mono text-[11px] font-bold text-emerald-600">
                System Ready
              </span>

            </div>

            {/* Main Heading */}
            <h1 className="animate-fade-in-up animation-delay-100 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Smart Disaster Management
              <br className="hidden sm:inline" />

              <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                for Safer Communities
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="animate-fade-in-up animation-delay-200 mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
              A unified platform connecting citizens and authorities for faster
              disaster reporting, real-time awareness, coordinated response,
              and safer communities.
            </p>

            {/* ==================================================
                CTA BUTTONS
            =================================================== */}
            <div className="animate-fade-in-up animation-delay-300 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">

              {/* Report Disaster */}
              <Link
                href="/citizen/login"
                className="w-full sm:w-auto"
              >
                <SpecularButton
                  size="md"
                  radius={14}
                  tint="#dc2626"
                  tintOpacity={1}
                  blur={0}
                  textColor="#ffffff"
                  lineColor="#ffffff"
                  baseColor="#dc2626"
                  intensity={2.2}
                  shineSize={18}
                  shineFade={55}
                  thickness={1.5}
                  speed={0.5}
                  followMouse
                  proximity={280}
                  autoAnimate={false}
                  className="
                    w-full
                    min-w-[220px]
                    font-bold
                    tracking-tight
                    shadow-lg
                    shadow-red-600/25
                    hover:shadow-xl
                    hover:shadow-red-600/30
                  "
                >
                  <span className="relative z-[10] flex items-center justify-center gap-2 text-white">
                    <AlertCircle className="h-4 w-4 shrink-0 text-white" />
                    <span className="text-white">
                      Report a Disaster
                    </span>
                  </span>
                </SpecularButton>
              </Link>

              {/* Authority Login */}
              <Link
                href="/authority/login"
                className="w-full sm:w-auto"
              >
                <SpecularButton
                  size="md"
                  radius={14}
                  tint="#2563eb"
                  tintOpacity={1}
                  blur={0}
                  textColor="#ffffff"
                  lineColor="#ffffff"
                  baseColor="#2563eb"
                  intensity={2.2}
                  shineSize={18}
                  shineFade={55}
                  thickness={1.5}
                  speed={0.5}
                  followMouse
                  proximity={280}
                  autoAnimate={false}
                  className="
                    w-full
                    min-w-[220px]
                    font-bold
                    tracking-tight
                    shadow-lg
                    shadow-blue-600/25
                    hover:shadow-xl
                    hover:shadow-blue-600/30
                  "
                >
                  <span className="relative z-[10] flex items-center justify-center gap-2 text-white">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-white" />
                    <span className="text-white">
                      Authority Login
                    </span>
                  </span>
                </SpecularButton>
              </Link>

            </div>

            {/* ==================================================
                TRUST / PROTOCOL HIGHLIGHTS
            =================================================== */}
            <div className="animate-fade-in-up animation-delay-400 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 text-center sm:grid-cols-3 lg:text-left">

              {/* Incident Triage */}
              <div>
                <p className="font-mono text-xs text-slate-500">
                  INCIDENT TRIAGE
                </p>

                <p className="mt-0.5 flex items-center justify-center space-x-1 text-sm font-semibold text-slate-800 lg:justify-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Sub-second Priority</span>
                </p>
              </div>

              {/* Geo Monitoring */}
              <div>
                <p className="font-mono text-xs text-slate-500">
                  GEO-MONITORING
                </p>

                <p className="mt-0.5 flex items-center justify-center space-x-1 text-sm font-semibold text-slate-800 lg:justify-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>GPS Coordinate Grid</span>
                </p>
              </div>

              {/* Responders */}
              <div>
                <p className="font-mono text-xs text-slate-500">
                  FIRST RESPONDERS
                </p>

                <p className="mt-0.5 flex items-center justify-center space-x-1 text-sm font-semibold text-slate-800 lg:justify-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Multi-agency Dispatch</span>
                </p>
              </div>

            </div>
          </div>

          {/* ==================================================
              RIGHT COLUMN — LIVE MAP
          =================================================== */}
          <div className="relative animate-fade-in animation-delay-300 lg:col-span-5">

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">

              {/* Map Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">

                <div className="flex items-center space-x-2">

                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                  <span className="font-mono text-xs font-bold uppercase tracking-wide text-slate-800">
                    Tactical Situational View
                  </span>

                </div>

                <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                  LIVE GRID #409
                </span>

              </div>

              {/* Real Leaflet Map */}
              <div className="relative my-4 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <LiveDisasterMap />
              </div>

              {/* Map Telemetry */}
              <div className="flex items-center justify-between pt-2 font-mono text-[11px] text-slate-500">

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span>Live Incident Monitoring</span>
                </span>

                <span className="font-semibold text-emerald-600">
                  LIVE
                </span>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}