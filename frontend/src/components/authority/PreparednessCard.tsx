'use client';
import { useEffect, useState } from 'react';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface PreparednessData {
  score: number;
  status: 'well_prepared' | 'moderate' | 'at_risk' | 'critical';
  state: string | null;
  district: string | null;
  metrics: {
    totalShelters: number;
    activeShelters: number;
    totalCapacity: number;
    availableCapacity: number;
    totalTeams: number;
    availableTeams: number;
    activeRiskZones: number;
    highRiskZones: number;
    vulnerableZones: number;
  };
}

const STATUS_CONFIG = {
  well_prepared: { label: 'Well Prepared', color: 'emerald', icon: ShieldCheck },
  moderate: { label: 'Moderate', color: 'amber', icon: ShieldAlert },
  at_risk: { label: 'At Risk', color: 'orange', icon: ShieldAlert },
  critical: { label: 'Critical', color: 'red', icon: ShieldX },
};

export default function PreparednessCard() {
  const [data, setData] = useState<PreparednessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetchFromApi<PreparednessData>(API_ENDPOINTS.PREPAREDNESS);
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse h-40" />
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];
  const Icon = config.icon;

  return (
    <div className={`bg-white rounded-2xl border border-${config.color}-200 shadow-xs p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${config.color}-600`} />
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Preparedness Status
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-${config.color}-50 text-${config.color}-700 border border-${config.color}-200`}>
          {config.label} — {data.score}/100
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-black text-slate-900 font-mono">{data.metrics.availableTeams}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Teams Ready</p>
        </div>
        <div>
          <p className="text-lg font-black text-slate-900 font-mono">{data.metrics.availableCapacity}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Shelter Beds</p>
        </div>
        <div>
          <p className="text-lg font-black text-slate-900 font-mono">{data.metrics.vulnerableZones}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Vulnerable Zones</p>
        </div>
      </div>
    </div>
  );
}