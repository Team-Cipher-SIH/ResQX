'use client';

import { useState } from 'react';
import { MOCK_WORKFLOW_STEPS } from '@/data/mockData';
import {
  ChevronRight,
  FileSpreadsheet,
  ShieldCheck,
  Cpu,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import PixelSwap from '@/components/Reactbits/PixelSwap';

export default function HowItWorks() {
  const [workflowHovered, setWorkflowHovered] = useState(false);

  const getStepIcon = (code: string) => {
    switch (code) {
      case 'REPORT':
        return (
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
        );

      case 'VERIFY':
        return (
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        );

      case 'ANALYZE':
        return (
          <Cpu className="h-5 w-5 text-indigo-600" />
        );

      case 'RESPOND':
        return (
          <Truck className="h-5 w-5 text-red-600" />
        );

      case 'RESOLVE':
        return (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        );

      default:
        return (
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
        );
    }
  };

  const stepDelayClass = (idx: number) => {
    const delays = [
      'animation-delay-100',
      'animation-delay-200',
      'animation-delay-300',
      'animation-delay-400',
      'animation-delay-500',
    ];

    return delays[idx] ?? '';
  };

  return (
    <section
      id="how-it-works"
      className="relative border-b border-slate-200 bg-white py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* =====================================================
            SECTION HEADER
        ====================================================== */}
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">

          <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-emerald-600">
            <span>OPERATIONAL WORKFLOW</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How The Platform Operates
          </h2>

          <p className="text-base text-slate-600">
            From initial citizen submission to final incident resolution —
            a streamlined 5-step lifecycle.
          </p>
        </div>

        {/* =====================================================
            WORKFLOW BANNER
        ====================================================== */}
        <div
          className="animate-fade-in relative mb-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
          onMouseEnter={() => setWorkflowHovered(true)}
          onMouseLeave={() => setWorkflowHovered(false)}
        >

          {/* ==================================================
              PIXELSWAP BACKGROUND
          =================================================== */}
          <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.84]">

            <PixelSwap
              firstContent={
                <div className="h-full w-full bg-gradient-to-br from-blue-500/30 via-sky-400/10 to-emerald-500/20" />
              }
              secondContent={
                <div className="h-full w-full bg-gradient-to-br from-emerald-500/30 via-transparent to-blue-600/25" />
              }
              pixelSize={70}
              gap={2}
              pixelRadius={6}
              pixelSpin={0}
              pixelScale={0.72}
              duration={1500}
              pixelDuration={450}
              pattern="diagonal"
              randomness={0.12}
              fade
              trigger="manual"
              active={workflowHovered}
              aspectRatio="auto"
              className="h-full w-full"
            />

          </div>

          {/* ==================================================
              ACTUAL WORKFLOW CONTENT
          =================================================== */}
          <div className="relative z-10 p-6 lg:p-8">

            {/* Workflow Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6 font-mono text-xs font-bold text-slate-700">

              <span className="text-slate-500">
                INCIDENT LIFECYCLE PIPELINE
              </span>

              <div className="flex items-center space-x-2 text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />

                <span>
                  Standard Operating Procedure (SOP)
                </span>
              </div>

            </div>

            {/* ==================================================
                TIMELINE GRID
            =================================================== */}
            <div className="relative grid grid-cols-1 gap-4 pt-6 md:grid-cols-5">

              {MOCK_WORKFLOW_STEPS.map((item, idx) => (
                <div
                  key={item.code}
                  className={`animate-fade-in-up ${stepDelayClass(
                    idx
                  )} relative flex flex-col justify-between`}
                >

                  <div>

                    {/* Step Number */}
                    <div className="mb-3">
                      <span className="font-mono text-[10px] font-extrabold tracking-widest text-slate-400">
                        STEP {String(item.step).padStart(2, '0')}
                      </span>
                    </div>

                    {/* ==================================================
                        STEP HEADER
                    =================================================== */}
                    <div className="mb-3 flex items-center justify-between">

                      <div className="flex items-center space-x-2">

                        {/* NORMAL ICON — NO PIXELSWAP HERE */}
                        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                          {getStepIcon(item.code)}
                        </div>

                        {/* Step Code */}
                        <span className="font-mono text-xs font-extrabold text-slate-800">
                          {item.code}
                        </span>

                      </div>

                      {/* Arrow */}
                      {idx < MOCK_WORKFLOW_STEPS.length - 1 && (
                        <ChevronRight className="hidden h-5 w-5 text-slate-300 md:block" />
                      )}

                    </div>

                    {/* Title */}
                    <h3 className="mb-1 text-sm font-bold text-slate-800">
                      {item.step}. {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>

                  </div>

                  {/* Tag */}
                  <div className="mt-4 border-t border-slate-200/60 pt-3">

                    <span className="inline-block rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">
                      {item.tag}
                    </span>

                  </div>

                </div>
              ))}

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}