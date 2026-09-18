'use client';

import dynamic from 'next/dynamic';
import type { Incident, ResponseTeam, Shelter } from '@/types/authority';

export type CommandMapScope = 'central' | 'state' | 'district';
export type { Shelter };

export interface CommandMapProps {
  scope?: CommandMapScope;
  state?: string;
  district?: string;
  incidents?: Incident[];
  teams?: ResponseTeam[];
  shelters?: Shelter[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident | null) => void;
  onSelectTeam?: (team: ResponseTeam | null) => void;
  height?: string;
  className?: string;
}

const CommandMapClient = dynamic(() => import('./CommandMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-600">Initializing Tactical Command Map...</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Loading geospatial telemetry and response grids</p>
    </div>
  ),
});

export default function CommandMap(props: CommandMapProps) {
  return <CommandMapClient {...props} />;
}

