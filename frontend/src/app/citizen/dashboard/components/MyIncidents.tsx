'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchFromApi } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import {
  Clock,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  Home,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import PulsingDot from '@/components/ui/PulsingDot';

export interface IncidentItem {
  _id: string;
  title: string;
  description: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  location?: {
    type: string;
    coordinates: [number, number];
  };
  address?: string;
  state: string;
  district: string;
  mediaUrls?: string[];
  isSOS?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MyIncidentsProps {
  refreshKey?: number;
  onDataLoaded?: (incidents: IncidentItem[]) => void;
}

const LIFECYCLE_STEPS = [
  { id: 'reported', label: 'Report Submitted', desc: 'Alert logged in command center' },
  { id: 'verified', label: 'Authority Review', desc: 'Verified by jurisdictional desk' },
  { id: 'assigned', label: 'Squad Dispatched', desc: 'Tactical response unit assigned' },
  { id: 'in_progress', label: 'Active Response', desc: 'Field teams operating on site' },
  { id: 'resolved', label: 'Resolved & Safe', desc: 'Emergency stabilized & secured' },
];

const getStepProgressIndex = (status: string) => {
  switch (status) {
    case 'reported': return 0;
    case 'verified': return 1;
    case 'assigned': return 2;
    case 'in_progress': return 3;
    case 'resolved':
    case 'closed': return 4;
    default: return 0;
  }
};

const getCitizenSafetyGuidance = (type: string, severity: string) => {
  if (severity === 'critical') {
    return 'Critical emergency protocol: Evacuate hazard perimeter immediately, follow official authority directions, and proceed to the nearest designated relief camp.';
  }
  switch (type.toLowerCase()) {
    case 'flood':
      return 'Flood safety: Move to higher ground, avoid walking/driving through moving floodwaters, and keep emergency electronics in waterproof pouches.';
    case 'fire':
      return 'Fire safety: Stay low under smoke, seal doors if trapped, never use elevators, and assemble at designated open ground safety spots.';
    case 'earthquake':
      return 'Earthquake safety: Drop, Cover, and Hold On. Stay away from glass windows and power lines. Expect minor aftershocks.';
    default:
      return 'General advisory: Stay indoors if safe, keep phone lines open for emergency services, and monitor public disaster alerts.';
  }
};

export default function MyIncidents({ refreshKey = 0, onDataLoaded }: MyIncidentsProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetchFromApi<IncidentItem[]>('/incidents/my-reports');
      if (response.success && Array.isArray(response.data)) {
        setIncidents(response.data);
        setError(null);
        if (onDataLoaded) {
          onDataLoaded(response.data);
        }
      } else {
        setError(response.message || response.error || 'Unable to load incident reports');
      }
    } catch (err) {
      console.error('Failed to fetch user reports:', err);
      setError('Network error fetching your incident history');
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshKey, manualRefreshKey]);

  // Realtime updates when authority modifies incident status
  useSocket({
    'incident-updated': () => loadReports(),
  });

  const handleManualRefresh = () => {
    setIsLoading(true);
    setManualRefreshKey((prev) => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'In Progress (Active Response)',
          dot: <PulsingDot variant="warning" size="sm" />,
          className: 'bg-orange-50 text-orange-800 border-orange-200',
        };
      case 'assigned':
        return {
          label: 'Team Dispatched',
          dot: <PulsingDot variant="blue" size="sm" />,
          className: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'verified':
        return {
          label: 'Verified by Authority',
          dot: <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />,
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'resolved':
      case 'closed':
        return {
          label: 'Resolved & Safe',
          dot: <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />,
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'reported':
      default:
        return {
          label: 'Reported (Pending Review)',
          dot: <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />,
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 shadow-xs shadow-red-100';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <section id="my-incidents" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">
              Audit & Track
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {incidents.length} Reports
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            My Incident Reports & Tracking
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Live status of your submitted disaster alerts and emergency response dispatches.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-400">
          <RefreshCw className="mb-2 h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-sm">Fetching your submitted incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
          <AlertCircle className="mb-2 h-8 w-8 text-slate-300" />
          <h4 className="font-bold text-slate-700">No incident reports filed yet</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            When you report a disaster or dispatch an SOS alert, it will appear here with live verification tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const statusConfig = getStatusBadge(incident.status);
            const currentStepIdx = getStepProgressIndex(incident.status);
            const photoUrl = incident.mediaUrls && incident.mediaUrls.length > 0 ? incident.mediaUrls[0] : null;
            const isExpanded = expandedIncidentId === incident._id;
            const safetyAdvisory = getCitizenSafetyGuidance(incident.type, incident.severity);

            return (
              <div
                key={incident._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 p-5 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-md space-y-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {incident.isSOS && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-xs">
                          <PulsingDot variant="critical" size="sm" />
                          SOS Emergency
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity === 'critical' && <PulsingDot variant="critical" size="sm" />}
                        {incident.severity} Severity
                      </span>
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                        {incident.type}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusConfig.className}`}>
                        {statusConfig.dot}
                        {statusConfig.label}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {incident.title}
                    </h4>

                    <p className="text-xs leading-relaxed text-slate-600">
                      {incident.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {incident.district}, {incident.state} {incident.address ? `(${incident.address})` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(incident.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  {photoUrl && (
                    <div className="shrink-0">
                      <a
                        href={photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/img block relative overflow-hidden rounded-xl border border-slate-200 shadow-xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={incident.title}
                          className="h-24 w-28 object-cover transition duration-300 group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                {/* Visual Operational Stepper for Citizens */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/80">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Live Response Status</p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const isPast = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const isFuture = idx > currentStepIdx;

                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                              isPast
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isCurrent
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] font-bold leading-tight ${
                              isCurrent ? 'text-blue-700' : isPast ? 'text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Safety Advisory Banner */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">Citizen Safety Advisory</span>
                    <p className="leading-relaxed">{safetyAdvisory}</p>
                  </div>
                  <a
                    href="#relief-camps"
                    className="shrink-0 px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 font-bold text-[10px] rounded-lg transition-colors"
                  >
                    Nearby Shelters
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
