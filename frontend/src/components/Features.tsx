'use client';

import {
  MOCK_CORE_PILLARS,
  MOCK_PLATFORM_FEATURES,
} from '@/data/mockData';

import {
  FileText,
  Activity,
  ShieldAlert,
  Radio,
  Send,
  MapPin,
  Cpu,
  BellRing,
  Users,
  BarChart3,
} from 'lucide-react';

import MagicBento from '@/components/MagicBento';

export default function Features() {
  const getPillarIcon = (name: string) => {
    switch (name) {
      case 'FileText':
        return <FileText className="h-6 w-6 text-blue-600" />;

      case 'Activity':
        return <Activity className="h-6 w-6 text-emerald-600" />;

      case 'ShieldAlert':
        return <ShieldAlert className="h-6 w-6 text-amber-600" />;

      case 'Radio':
        return <Radio className="h-6 w-6 text-red-600" />;

      default:
        return <Activity className="h-6 w-6 text-blue-600" />;
    }
  };

  const getFeatureIcon = (name: string) => {
    switch (name) {
      case 'Send':
        return <Send className="h-5 w-5 text-emerald-600" />;

      case 'MapPin':
        return <MapPin className="h-5 w-5 text-blue-600" />;

      case 'Cpu':
        return <Cpu className="h-5 w-5 text-indigo-600" />;

      case 'BellRing':
        return <BellRing className="h-5 w-5 text-red-600" />;

      case 'Users':
        return <Users className="h-5 w-5 text-amber-600" />;

      case 'BarChart3':
        return <BarChart3 className="h-5 w-5 text-sky-600" />;

      default:
        return <Activity className="h-5 w-5 text-blue-400" />;
    }
  };

  // Convert existing platform feature data into the format
  // expected by MagicBento.
  const magicBentoCards = MOCK_PLATFORM_FEATURES.map((feature) => ({
    color: '#ffffff',
    title: feature.title,
    description: feature.description,
    label: feature.category,
    category: feature.category,
    icon: getFeatureIcon(feature.iconName),
  }));

  return (
    <section
      id="features"
      className="relative border-b border-slate-200 bg-slate-50 py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ==================================================
            MAIN SECTION HEADER
        =================================================== */}
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">

          <div className="inline-flex items-center space-x-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 font-mono text-xs text-blue-700">
            <span>CORE PLATFORM FUNCTIONALITY</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            One Platform. Complete Disaster Response.
          </h2>

          <p className="text-base text-slate-600">
            Bridging the communication gap between citizens on the ground
            and disaster-management authorities in command centers.
          </p>

        </div>

        {/* ==================================================
            4 CORE PILLARS
        =================================================== */}
        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

          {MOCK_CORE_PILLARS.map((pillar) => (
            <div
              key={pillar.id}
              className="
                group
                relative
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                p-6
                transition-all
                duration-300
                hover:-translate-y-1.5
                hover:border-slate-300
                hover:shadow-md
              "
            >
              <div className="mb-4 flex items-center justify-between">

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all duration-200 group-hover:scale-110 group-hover:border-slate-300">
                  {getPillarIcon(pillar.iconName)}
                </div>

                <span className="font-mono text-2xl font-bold text-slate-300 transition-colors duration-200 group-hover:text-slate-400">
                  {pillar.number}
                </span>

              </div>

              <h3 className="mb-2 text-lg font-bold text-slate-900">
                {pillar.title}
              </h3>

              <p className="text-xs leading-relaxed text-slate-600">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* ==================================================
            DETAILED PLATFORM CAPABILITIES HEADER
        =================================================== */}
        <div className="mb-12 border-t border-slate-200 pt-16">

          <div className="flex flex-col justify-between md:flex-row md:items-end">

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Platform Features & Technical Capabilities
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Built for high availability, low latency, and intuitive
                emergency coordination.
              </p>
            </div>

            <span className="mt-4 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600 shadow-sm md:mt-0">
              Scope: Phase 1 Frontend Structure
            </span>
          </div>
        </div>

        {/* ==================================================
            6 PLATFORM FEATURE CARDS
            MagicBento
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
      </div>
    </section>
  );
}
