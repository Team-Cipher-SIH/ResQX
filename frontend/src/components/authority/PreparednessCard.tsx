'use client';

import { useEffect, useState } from 'react';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Home,
  Users,
  Droplets,
  Pill,
  Utensils,
  ListChecks,
  Clock,
} from 'lucide-react';

interface PreparednessData {
  state: string | null;
  district: string | null;
  disasterType: string;
  shelterReadiness: number;
  teamsAvailable: number;
  waterStatus: 'AVAILABLE' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' | 'UNKNOWN';
  medicineStatus: 'AVAILABLE' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' | 'UNKNOWN';
  foodStatus: 'AVAILABLE' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' | 'UNKNOWN';
  actions: string[];
  score: number;
  status: 'well_prepared' | 'moderate' | 'at_risk' | 'critical';
  lastUpdated: string;
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

const STATUS_CONFIG: Record <
  PreparednessData['status'],
  { label: string; color: string; icon: typeof ShieldCheck }
> = {
  well_prepared: { label: 'Well Prepared', color: 'emerald', icon: ShieldCheck },
  moderate: { label: 'Moderate', color: 'amber', icon: ShieldAlert },
  at_risk: { label: 'At Risk', color: 'orange', icon: ShieldAlert },
  critical: { label: 'Critical', color: 'red', icon: ShieldX },
};

const SUPPLY_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOW: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  OUT_OF_STOCK: 'bg-red-50 text-red-700 border-red-200',
  UNKNOWN: 'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUS_BADGE_STYLES: Record<PreparednessData['status'], string> = {
  well_prepared: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  at_risk: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICON_STYLES: Record<PreparednessData['status'], string> = {
  well_prepared: 'text-emerald-600',
  moderate: 'text-amber-600',
  at_risk: 'text-orange-600',
  critical: 'text-red-600',
};

interface PreparednessCardProps {
  disasterType?: 'flood' | 'fire' | 'earthquake';
}

export default function PreparednessCard({ disasterType }: PreparednessCardProps) {
  const [data, setData] = useState<PreparednessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const endpoint = disasterType
        ? `${API_ENDPOINTS.PREPAREDNESS}?disasterType=${disasterType}`
        : API_ENDPOINTS.PREPAREDNESS;
      const res = await fetchFromApi<PreparednessData>(endpoint);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load preparedness status.');
      }
      setLoading(false);
    };
    load();
  }, [disasterType]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 animate-pulse h-52" />
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <p className="text-xs text-slate-400">
          {error || 'Preparedness data unavailable right now.'}
        </p>
      </div>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${STATUS_ICON_STYLES[data.status]}`} />
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Preparedness Status
          </h3>
          {data.disasterType !== 'all' && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
              {data.disasterType}
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE_STYLES[data.status]}`}
        >
          {config.label} — {data.score}/100
        </span>
      </div>

      {/* Core readiness metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
          <Home className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-900 font-mono">{data.shelterReadiness}%</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Shelter Readiness</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
          <Users className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-900 font-mono">{data.teamsAvailable}</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Teams Ready</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
          <ShieldAlert className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-900 font-mono">{data.metrics.vulnerableZones}</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Vulnerable Zones</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
          <Home className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
          <p className="text-lg font-black text-slate-900 font-mono">{data.metrics.availableCapacity}</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Shelter Beds</p>
        </div>
      </div>

      {/* Supply status pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${SUPPLY_STATUS_STYLES[data.waterStatus]}`}
        >
          <Droplets className="w-3.5 h-3.5" />
          Water: {data.waterStatus.replace('_', ' ')}
        </span>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${SUPPLY_STATUS_STYLES[data.medicineStatus]}`}
        >
          <Pill className="w-3.5 h-3.5" />
          Medicine: {data.medicineStatus.replace('_', ' ')}
        </span>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${SUPPLY_STATUS_STYLES[data.foodStatus]}`}
        >
          <Utensils className="w-3.5 h-3.5" />
          Food: {data.foodStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Recommended actions */}
      {data.actions && data.actions.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <ListChecks className="w-3.5 h-3.5" />
            Recommended Actions
          </div>
          <ul className="space-y-1">
            {data.actions.map((action, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last updated */}
      <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
        <Clock className="w-3 h-3" />
        Last updated: {new Date(data.lastUpdated).toLocaleString('en-IN')}
      </div>
    </div>
  );
}