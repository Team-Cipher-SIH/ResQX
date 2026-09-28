'use client';

import dynamic from 'next/dynamic';
import type { CitizenIncident, CitizenShelter, CitizenAlert } from '@/data/citizenMapMockData';

export interface CitizenMapProps {
  incidents?: CitizenIncident[];
  shelters?: CitizenShelter[];
  alerts?: CitizenAlert[];
  height?: string;
  className?: string;
}

const CitizenMapClient = dynamic(() => import('./CitizenMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-700">Loading Nearby Safety & Disaster Map...</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Locating community shelters, active hazards, and relief zones</p>
    </div>
  ),
});

export default function CitizenMap(props: CitizenMapProps) {
  return <CitizenMapClient {...props} />;
}
