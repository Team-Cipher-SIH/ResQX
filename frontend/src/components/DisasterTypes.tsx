'use client';

import { MOCK_DISASTER_CATEGORIES } from '@/data/mockData';

import {
  Waves,
  Zap,
  Wind,
  Flame,
  Mountain,
  CloudLightning,
  ShieldAlert,
} from 'lucide-react';

import MagicBento from '@/components/MagicBento';

export default function DisasterTypes() {
  const getDisasterIcon = (iconName: string) => {
    switch (iconName) {
      case 'Waves':
        return <Waves className="h-5 w-5 text-blue-600" />;

      case 'Zap':
        return <Zap className="h-5 w-5 text-amber-600" />;

      case 'Wind':
        return <Wind className="h-5 w-5 text-sky-600" />;

      case 'Flame':
        return <Flame className="h-5 w-5 text-red-600" />;

      case 'Mountain':
        return <Mountain className="h-5 w-5 text-emerald-600" />;

      case 'CloudLightning':
        return <CloudLightning className="h-5 w-5 text-indigo-600" />;

      default:
        return <ShieldAlert className="h-5 w-5 text-slate-500" />;
    }
  };

  const magicBentoCards = MOCK_DISASTER_CATEGORIES.map(
    (disaster) => ({
      color: '#ffffff',

      title: disaster.name,

      description: disaster.description,

      label: disaster.badgeText,

      category: `Threat Rating: ${disaster.alertLevel}`,

      icon: getDisasterIcon(disaster.iconName),
    })
  );

  return (
    <section
      id="disaster-types"
      className="relative border-b border-slate-200 bg-slate-50 py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ==================================================
            SECTION HEADER
        =================================================== */}
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">

          <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-red-600 shadow-sm">
            <span>HAZARD CATEGORIZATION</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Supported Disaster Classifications
          </h2>

          <p className="text-base text-slate-600">
            Multi-hazard taxonomy configured to process reporting protocols
            for both natural and industrial emergencies.
          </p>

        </div>

        {/* ==================================================
            DISASTER CARDS + MAGIC BENTO EFFECT
        =================================================== */}
        <MagicBento
          cards={magicBentoCards}
          textAutoHide={false}
          enableStars
          enableSpotlight
          enableBorderGlow
          enableTilt
          enableMagnetism
          clickEffect
          spotlightRadius={360}
          particleCount={12}
          glowColor="37, 99, 235"
          disableAnimations={false}
        />

        {/* ==================================================
            INFORMATIONAL DISCLAIMER
        =================================================== */}
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">

          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              Note:
            </span>{' '}
            Hazard categories shown are UI demonstration models.
            Live telemetry feeds will be integrated via Express REST API
            in Phase 2.
          </p>

        </div>

      </div>
    </section>
  );
}