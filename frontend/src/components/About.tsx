'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
    ShieldCheck,
    MapPin,
    Radio,
    BrainCircuit,
    Siren,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';

export default function AboutResQtech() {
    const [showDetails, setShowDetails] = useState(false);

    const stats = [
        {
            icon: ShieldCheck,
            value: '24/7',
            label: 'Response Ready',
        },
        {
            icon: MapPin,
            value: 'GPS',
            label: 'Location Aware',
        },
        {
            icon: BrainCircuit,
            value: 'AI',
            label: 'Decision Support',
        },
        {
            icon: Siren,
            value: 'SOS',
            label: 'Emergency Ready',
        },
    ];

    const workflow = [
        'Detect',
        'Verify',
        'Assign',
        'Respond',
        'Resolve',
    ];

    return (
        <>
            <section
                id="about"
                className="relative overflow-hidden bg-slate-50 py-24 text-slate-900"
            >
                {/* =========================================================
            BACKGROUND DISASTER IMAGE
        ========================================================= */}
                <div className="absolute inset-0">
                    <Image
                        src="/pictures/disaster-bg.jpg"
                        alt=""
                        fill
                        priority
                        className="object-cover object-center opacity-[0.12]"
                    />

                    {/* Bright readable overlay */}
                    <div className="absolute inset-0 bg-white/80" />

                    {/* Soft brand tint */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/80 via-white/85 to-emerald-50/60" />
                </div>

                {/* =========================================================
            SUBTLE GRID
        ========================================================= */}
                <div className="absolute inset-0 overflow-hidden">
                    <Image
                        src="/pictures/disaster-bg.jpg"
                        alt=""
                        fill
                        priority
                        sizes="100vw"
                        className="object-contain object-center opacity-40"
                    />

                    <div className="absolute inset-0 bg-white/30" />

                    <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/35 to-emerald-50/25" />
                </div>
                {/* =========================================================
            CONTENT
        ========================================================= */}
                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

                    {/* Small label */}
                    <div className="mb-12 flex flex-wrap items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-600">
                            About ResQtech
                        </span>

                        <span className="h-px w-16 bg-slate-300" />

                        <span className="text-xs font-mono text-slate-400">
                            SMART DISASTER MANAGEMENT
                        </span>
                    </div>

                    {/* =======================================================
              MAIN GRID
          ======================================================= */}
                    <div className="grid items-center gap-14 lg:grid-cols-[360px_1fr]">

                        {/* =====================================================
                LEFT — CLEAN IMAGE ONLY
            ===================================================== */}
                        <div className="relative">

                            {/* Soft background glow */}
                            <div className="absolute -inset-5 rounded-[2rem] bg-blue-500/10 blur-2xl" />

                            <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-3 shadow-[0_25px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">

                                <div className="relative h-[470px] overflow-hidden rounded-[1.5rem]">

                                    <Image
                                        src="/pictures/disaster-leader.jpg"
                                        alt="ResQtech"
                                        fill
                                        priority
                                        className="object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
                                    />

                                    {/* Very subtle bottom fade only */}
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/30 to-transparent" />
                                </div>

                            </div>

                            {/* Small caption below image */}
                            <div className="mt-5 text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                                    Smart Disaster Management
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                    Technology for safer communities
                                </p>
                            </div>
                        </div>

                        {/* =====================================================
                RIGHT — ABOUT CONTENT
            ===================================================== */}
                        <div>

                            <h2 className="text-5xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
                                Stronger Together,
                                <span className="block bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">
                                    Safer Forever.
                                </span>
                            </h2>

                            <div className="mt-6 h-1 w-24 rounded-full bg-blue-600" />

                            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-700">
                                ResQtech is a unified disaster-management platform that
                                connects citizens, authorities, departments and responders
                                through a single operational network.
                            </p>

                            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">
                                From incident reporting and GPS-based location capture to
                                verification, prioritization, assignment and response
                                tracking, the platform is designed to reduce communication
                                gaps during emergencies.
                            </p>

                            {/* =====================================================
                  STATS
              ===================================================== */}
                            <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">

                                {stats.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div
                                            key={item.label}
                                            className="group rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                                        >
                                            <Icon className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:scale-110" />

                                            <p className="mt-4 text-xl font-black text-slate-900">
                                                {item.value}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* =====================================================
                  WORKFLOW
              ===================================================== */}
                            <div className="mt-10 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-md">

                                <div className="mb-4 flex items-center gap-2">
                                    <Radio className="h-4 w-4 text-emerald-500" />

                                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                                        Response Workflow
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {workflow.map((step, index) => (
                                        <div
                                            key={step}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                                {step}
                                            </span>

                                            {index !== workflow.length - 1 && (
                                                <ArrowRight className="h-4 w-4 text-slate-300" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* =====================================================
                  CTA
              ===================================================== */}
                            <div className="mt-8 flex flex-wrap items-center gap-4">

                                <button
                                    type="button"
                                    onClick={() => setShowDetails(true)}
                                    className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                                >
                                    Explore ResQtech

                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </button>

                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Built for coordinated emergency response
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===========================================================
          MODAL
      =========================================================== */}
            {showDetails && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-md"
                    onClick={() => setShowDetails(false)}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/60 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl md:px-8">

                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                                    Platform Overview
                                </p>

                                <h3 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                                    One Platform. Complete Disaster Response.
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-8 px-6 py-7 md:px-8">

                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6">
                                <h4 className="text-lg font-bold text-blue-900">
                                    Our Mission
                                </h4>

                                <p className="mt-2 leading-7 text-slate-700">
                                    ResQtech aims to reduce the communication gap between
                                    people facing emergencies and the authorities responsible
                                    for responding to them by bringing reporting, awareness
                                    and coordinated response into one platform.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold text-slate-900">
                                    How ResQtech Works
                                </h4>

                                <div className="mt-4 grid gap-4 md:grid-cols-4">
                                    {[
                                        {
                                            number: '01',
                                            title: 'Detect',
                                            text: 'Citizens report incidents with details, location and evidence.',
                                        },
                                        {
                                            number: '02',
                                            title: 'Verify',
                                            text: 'Authorities review the incident and determine priority.',
                                        },
                                        {
                                            number: '03',
                                            title: 'Respond',
                                            text: 'Verified incidents are assigned to responders or departments.',
                                        },
                                        {
                                            number: '04',
                                            title: 'Resolve',
                                            text: 'Response progress is tracked until closure.',
                                        },
                                    ].map((step) => (
                                        <div
                                            key={step.number}
                                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <span className="text-xs font-black tracking-widest text-blue-600">
                                                {step.number}
                                            </span>

                                            <h5 className="mt-2 font-bold text-slate-900">
                                                {step.title}
                                            </h5>

                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {step.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold text-slate-900">
                                    Core Capabilities
                                </h4>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        'Citizen incident reporting',
                                        'GPS-based emergency location',
                                        'Photo evidence collection',
                                        'Incident verification',
                                        'Priority-based dispatch',
                                        'Responder coordination',
                                        'Emergency alerts',
                                        'Situational awareness',
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />

                                            <span className="text-sm text-slate-700">
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 md:px-8">
                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}