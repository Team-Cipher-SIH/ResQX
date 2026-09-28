'use client';

import Link from 'next/link';
import { Shield, ArrowUpRight } from 'lucide-react';

import Particles from '@/components/Reactbits/Particles';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-800 bg-slate-950 pb-12 pt-16 text-slate-300">

      {/* =====================================================
          PARTICLE BACKGROUND
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Particles
          particleColors={[
            '#ffffff',
            '#bfdbfe',
            '#60a5fa',
            '#93c5fd',
          ]}
          particleCount={240}
          particleSpread={10}
          speed={0.12}
          particleBaseSize={100}
          sizeRandomness={1}
          moveParticlesOnHover
          particleHoverFactor={0.5}
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
          className="h-full w-full opacity-80"
        />
      </div>

      {/* =====================================================
          SOFT OVERLAY
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-slate-950/25" />

      {/* =====================================================
          SUBTLE BLUE GLOW
      ====================================================== */}
      <div className="pointer-events-none absolute -left-32 top-1/3 z-[1] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="pointer-events-none absolute -right-32 bottom-0 z-[1] h-[280px] w-[280px] rounded-full bg-indigo-500/10 blur-[110px]" />

      {/* =====================================================
          FOOTER CONTENT
      ====================================================== */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ===================================================
            MAIN FOOTER GRID
        ==================================================== */}
        <div className="grid grid-cols-1 gap-8 border-b border-white/10 pb-12 md:grid-cols-12">

          {/* =================================================
              BRAND COLUMN
          ================================================= */}
          <div className="space-y-4 md:col-span-5">

            <div className="flex items-center space-x-3">

              <div className="flex items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10 p-2 text-blue-300 shadow-lg shadow-blue-900/20 backdrop-blur-sm">
                <Shield className="h-5 w-5" />
              </div>

              <span className="font-mono text-xl font-extrabold tracking-tight text-white">
                ResQ
                <span className="text-blue-400">
                  tech
                </span>
              </span>

            </div>

            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Smart Disaster Management System — A modern emergency
              mitigation and response coordination platform connecting
              citizens and authorities.
            </p>

            {/* System Motto */}
            <div className="inline-flex items-center space-x-2 rounded border border-white/10 bg-slate-900/60 px-3 py-1.5 font-mono text-[11px] text-blue-200 shadow-sm backdrop-blur-md">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

              <span>
                System Motto: Detect. Respond. Protect.
              </span>

            </div>

          </div>

          {/* =================================================
              PLATFORM LINKS
          ================================================== */}
          <div className="space-y-3 md:col-span-3">

            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform Navigation
            </h4>

            <ul className="space-y-2 text-xs">

              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-blue-300"
                >
                  Home Overview
                </Link>
              </li>

              <li>
                <Link
                  href="#features"
                  className="transition-colors hover:text-blue-300"
                >
                  Platform Features
                </Link>
              </li>

              <li>
                <Link
                  href="#how-it-works"
                  className="transition-colors hover:text-blue-300"
                >
                  Operational Workflow
                </Link>
              </li>

              <li>
                <Link
                  href="#disaster-types"
                  className="transition-colors hover:text-blue-300"
                >
                  Hazard Categories
                </Link>
              </li>

            </ul>

          </div>

          {/* =================================================
              PORTALS & ACCESS
          ================================================== */}
          <div className="space-y-3 md:col-span-4">

            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Portals & Access
            </h4>

            <ul className="space-y-2.5 text-xs">

              <li>
                <Link
                  href="/citizen/login"
                  className="inline-flex items-center space-x-1.5 font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <span>
                    Citizen Reporting Portal
                  </span>

                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>

              <li>
                <Link
                  href="/authority/login"
                  className="inline-flex items-center space-x-1.5 font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  <span>
                    Authority Command Portal
                  </span>

                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>

              <li className="pt-2 text-[11px] leading-relaxed text-slate-500">

                <span className="font-semibold text-slate-300">
                  Backend Integration Architecture:
                </span>{' '}

                Next.js App Router Frontend → Express REST API
                (`NEXT_PUBLIC_API_URL`) → MongoDB.

              </li>

            </ul>

          </div>

        </div>

        {/* =====================================================
            BOTTOM BAR
        ====================================================== */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[11px] text-slate-500 sm:flex-row">

          <p>
            © {new Date().getFullYear()} ResQtech Smart Disaster Management Platform.
            All rights reserved.
          </p>

          <p className="flex items-center space-x-1">

            <span>
              Engineered for Emergency Readiness
            </span>

            <span>•</span>

            <span className="font-mono text-blue-400">
              Phase 1 Next.js Frontend
            </span>

          </p>

        </div>

      </div>
    </footer>
  );
}