'use client';

import { useState } from 'react';
import Image from 'next/image';

const disasterGuidelines = [
  {
    title: 'Flood',
    image: '/pictures/flood.jpg',
    tagline: 'Water rises fast. Higher ground saves lives.',
    dos: [
      'Move to higher ground when water levels rise.',
      'Keep important documents and medicines safe.',
      'Follow official evacuation instructions.',
    ],
    donts: [
      'Do not walk or drive through moving flood water.',
      'Do not touch exposed electrical wires.',
    ],
    history:
      'Floods are among the most frequent disasters in India, often triggered by heavy monsoon rains, river overflow, or dam release. Just six inches of fast-moving water can knock an adult off their feet.',
    immediate: [
      'Switch off mains electricity and gas supply.',
      'Move valuables and people to the highest floor.',
      'Call local disaster helpline and share your exact location.',
    ],
  },
  {
    title: 'Fire',
    image: '/pictures/fire.jpg',
    tagline: 'Seconds count. Get out, stay out, call for help.',
    dos: [
      'Raise the alarm and alert people nearby.',
      'Use the nearest safe exit.',
      'Call emergency services immediately.',
    ],
    donts: [
      'Do not use elevators during a fire.',
      'Do not return inside a burning building.',
      'Do not attempt to extinguish large fires on your own.',
    ],
    history:
      'Structural and forest fires spread faster than most people expect — a small flame can engulf a room in under 3 minutes. Smoke inhalation, not flames, causes most fire-related deaths.',
    immediate: [
      'Crawl low under smoke to avoid toxic fumes.',
      'Feel doors before opening — never open a hot door.',
      'Once out, call fire services and never go back inside.',
    ],
  },
  {
    title: 'Earthquake',
    image: '/pictures/earthquake.jpg',
    tagline: 'Drop. Cover. Hold. Ride it out safely.',
    dos: [
      'Drop, cover and hold during shaking.',
      'Stay away from windows and heavy objects.',
      'Move to an open area after shaking stops.',
    ],
    donts: [
      'Do not run outside during strong shaking.',
      'Do not use lifts during an earthquake.',
    ],
    history:
      'India\'s Himalayan belt and parts of the northeast lie in high-risk seismic zones. Most earthquake injuries happen from falling objects and collapsing structures, not the ground shaking itself.',
    immediate: [
      'Get under sturdy furniture and hold on.',
      'Stay indoors until shaking completely stops.',
      'After shaking, check for gas leaks and structural damage before moving.',
    ],
  },
  {
    title: 'Cyclone',
    image: '/pictures/cyclone.jpg',
    tagline: 'Batten down early. Winds don\'t wait.',
    dos: [
      'Secure doors, windows and loose objects.',
      'Keep emergency supplies and batteries ready.',
      'Monitor official weather alerts.',
    ],
    donts: [
      'Do not go outside during severe winds.',
      'Do not ignore evacuation warnings.',
      'Do not drive through flooded roads.',
    ],
    history:
      'Coastal states like Odisha, Andhra Pradesh, and West Bengal face regular cyclonic storms from the Bay of Bengal, usually between April–June and October–December.',
    immediate: [
      'Move to a designated cyclone shelter if advised.',
      'Store drinking water and charge all devices in advance.',
      'Stay away from windows during peak wind activity.',
    ],
  },
  {
    title: 'Landslide',
    image: '/pictures/landslide.jpg',
    tagline: 'The ground can move without warning.',
    dos: [
      'Move away from steep slopes and unstable areas.',
      'Follow evacuation instructions immediately.',
      'Keep emergency supplies ready.',
    ],
    donts: [
      'Do not approach an active landslide area.',
      'Do not cross debris-covered roads.',
    ],
    history:
      'Hilly regions like Uttarakhand, Himachal Pradesh, and the Western Ghats see frequent landslides during heavy rainfall, often with little to no warning.',
    immediate: [
      'Move sideways away from the slide path, not downhill.',
      'Listen for unusual sounds like cracking trees or rumbling.',
      'Report the location to local authorities immediately.',
    ],
  },
  {
    title: 'Heat Wave',
    image: '/pictures/heatwave.jpg',
    tagline: 'Silent, deadly, and easy to underestimate.',
    dos: [
      'Stay hydrated throughout the day.',
      'Avoid direct sunlight during peak hours.',
      'Wear light and loose clothing.',
    ],
    donts: [
      'Do not leave children or pets inside parked vehicles.',
      'Do not perform strenuous outdoor activities at peak heat.',
    ],
    history:
      'Heat waves quietly cause more deaths in India each year than most other disasters combined, especially affecting outdoor workers, elderly people, and children.',
    immediate: [
      'Move to a cool or shaded area immediately.',
      'Sip water slowly — don\'t gulp large amounts at once.',
      'If someone shows confusion or stops sweating, seek medical help fast — it may be heatstroke.',
    ],
  },
  {
    title: 'Thunderstorm',
    image: '/pictures/thunderstorm.jpg',
    tagline: 'If you can hear thunder, you\'re in range.',
    dos: [
      'Stay indoors during lightning activity.',
      'Unplug sensitive electrical equipment.',
      'Monitor official weather alerts.',
    ],
    donts: [
      'Do not stand under isolated trees.',
      'Do not use wired electrical equipment during lightning.',
      'Do not take shelter in open fields or near water bodies.',
    ],
    history:
      'Lightning strikes kill more people in India annually than most other natural hazards, with rural and open-field areas most at risk.',
    immediate: [
      'Get indoors or into a hard-top vehicle right away.',
      'Avoid touching metal objects and plumbing.',
      'Wait 30 minutes after the last thunderclap before going back out.',
    ],
  },
  {
    title: 'Tsunami',
    image: '/pictures/tsunami.jpg',
    tagline: 'If the sea pulls back, run — don\'t watch.',
    dos: [
      'Move immediately to higher ground.',
      'Follow coastal evacuation routes.',
      'Listen to official emergency announcements.',
    ],
    donts: [
      'Do not go to the shore to watch the waves.',
      'Do not return until authorities declare it safe.',
    ],
    history:
      'The 2004 Indian Ocean tsunami reshaped coastal disaster planning across India, showing how a distant undersea earthquake can devastate shorelines within hours.',
    immediate: [
      'Head inland and to higher ground without waiting for official orders if you feel strong shaking near the coast.',
      'Do not return to low-lying areas until officials confirm it\'s safe.',
      'Help others move but do not delay your own evacuation.',
    ],
  },
];

type Disaster = (typeof disasterGuidelines)[number];

function DisasterCard({
  disaster,
  onViewMore,
}: {
  disaster: Disaster;
  onViewMore: (disaster: Disaster) => void;
}) {
  return (
    <article className="group w-[320px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={disaster.image}
          alt={disaster.title}
          fill
          sizes="320px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

        <h3 className="absolute bottom-4 left-5 text-2xl font-bold text-white">
          {disaster.title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="space-y-3">
          {disaster.dos.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                ✓
              </span>

              <p className="text-sm leading-6 text-slate-700">
                {item}
              </p>
            </div>
          ))}
        </div>

        <div className="my-5 border-t border-dashed border-slate-300" />

        <div className="space-y-3">
          {disaster.donts.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                ×
              </span>

              <p className="text-sm leading-6 text-slate-700">
                {item}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onViewMore(disaster)}
          className="mt-6 w-full text-right text-sm font-bold text-slate-800 transition-colors hover:text-blue-600"
        >
          View More →
        </button>
      </div>
    </article>
  );
}

function DisasterModal({
  disaster,
  onClose,
}: {
  disaster: Disaster;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div className="relative h-56 shrink-0">
          <Image
            src={disaster.image}
            alt={disaster.title}
            fill
            sizes="512px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800 shadow-md transition hover:bg-white"
            aria-label="Close"
          >
            ×
          </button>

          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-3xl font-black text-white">{disaster.title}</h2>
            <p className="mt-1 text-sm font-medium text-white/90">{disaster.tagline}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">

          {/* History */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Know The Threat
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {disaster.history}
            </p>
          </div>

          {/* Immediate action */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-600">
              Act Right Now
            </p>
            <div className="mt-3 space-y-2.5">
              {disaster.immediate.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Precautions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Stay Prepared
            </p>
            <div className="mt-3 space-y-2.5">
              {disaster.dos.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    ✓
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function DisasterGuidelines() {
  const [selected, setSelected] = useState<Disaster | null>(null);

  return (
    <section className="overflow-hidden bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Emergency Preparedness
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            Know What To Do
          </h2>

          <p className="mt-3 max-w-2xl text-slate-600">
            Learn essential safety actions for common disasters and
            emergencies.
          </p>
        </div>

        {/* Marquee */}
        <div className="relative">

          {/* Left fade */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-slate-50 to-transparent" />

          {/* Right fade */}
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-slate-50 to-transparent" />

          <div className="marquee-wrapper">
            <div className="marquee-track">

              {/* First copy */}
              <div className="flex gap-6">
                {disasterGuidelines.map((disaster) => (
                  <DisasterCard
                    key={`first-${disaster.title}`}
                    disaster={disaster}
                    onViewMore={setSelected}
                  />
                ))}
              </div>

              {/* Duplicate copy */}
              <div className="flex gap-6">
                {disasterGuidelines.map((disaster) => (
                  <DisasterCard
                    key={`second-${disaster.title}`}
                    disaster={disaster}
                    onViewMore={setSelected}
                  />
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>

      {selected && (
        <DisasterModal disaster={selected} onClose={() => setSelected(null)} />
      )}

      {/* Animation */}
      <style jsx>{`
        .marquee-wrapper {
          overflow: hidden;
          width: 100%;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 45s linear infinite;
        }

        .marquee-track:hover {
          animation-play-state: paused;
        }

        @keyframes marquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
