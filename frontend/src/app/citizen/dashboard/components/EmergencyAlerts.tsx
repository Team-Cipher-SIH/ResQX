'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi } from '@/lib/api';
import {
  AlertOctagon,
  Radio,
  MapPin,
  Calendar,
  RefreshCw,
  AlertCircle,
  Filter,
  Home,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export interface AlertItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedStates: string[];
  affectedDistricts: string[];
  isActive: boolean;
  issuedBy?: string;
  createdAt: string;
}

const INDIAN_STATES = [
  'Uttar Pradesh',
  'Maharashtra',
  'Bihar',
  'West Bengal',
  'Madhya Pradesh',
  'Tamil Nadu',
  'Rajasthan',
  'Karnataka',
  'Gujarat',
  'Andhra Pradesh',
  'Odisha',
  'Kerala',
  'Assam',
  'Punjab',
  'Haryana',
  'Delhi',
  'Uttarakhand',
  'Himachal Pradesh',
];

const SAFETY_GUIDELINES: Record<string, { title: string; do: string[]; dont: string[] }> = {
  flood: {
    title: 'Flood Emergency Safety Precautions',
    do: [
      'Move immediately to higher ground or an authorized relief shelter.',
      'Turn off main electricity switch and gas supply if water begins entering.',
      'Keep emergency go-bag ready with drinking water, dry food, medicines, and flashlight.',
      'Follow official evacuation routes and instructions broadcasted by authorities.',
    ],
    dont: [
      'Do not walk, swim, or drive through moving flood waters.',
      'Do not touch fallen power lines or submerged electrical appliances.',
      'Do not drink unfiltered tap water in flooded areas.',
    ],
  },
  fire: {
    title: 'Fire Hazard Safety Precautions',
    do: [
      'Evacuate immediately using designated fire escape staircases.',
      'Stay low to the ground to avoid inhaling toxic smoke.',
      'Cover your nose and mouth with a damp cloth if smoke is present.',
      'Call 101 or 112 emergency response once at a safe muster point.',
    ],
    dont: [
      'Do not use elevators during a fire evacuation.',
      'Do not re-enter a burning building to retrieve belongings.',
      'Do not open doors that feel hot to the touch.',
    ],
  },
  earthquake: {
    title: 'Earthquake Safety Precautions',
    do: [
      'DROP to your hands and knees, COVER your head and neck under a sturdy table, and HOLD ON.',
      'Stay away from glass windows, heavy mirrors, and tall furniture.',
      'If outdoors, move away from buildings, streetlights, and power lines to an open space.',
    ],
    dont: [
      'Do not run outside while shaking is occurring.',
      'Do not stand near doorways or use elevators.',
      'Do not ignite matches or lighters until gas leaks are ruled out.',
    ],
  },
  general: {
    title: 'General Civil Emergency Safety Precautions',
    do: [
      'Stay tuned to official government alerts on ResQTech.',
      'Identify the nearest active relief camp and keep family emergency contacts ready.',
      'Keep your phone battery charged and conserve power.',
    ],
    dont: [
      'Do not spread unverified social media rumors.',
      'Do not obstruct designated emergency vehicle corridors.',
    ],
  },
};

export default function EmergencyAlerts() {
  const [selectedState, setSelectedState] = useState<string>('Uttar Pradesh');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [guidanceModalDisaster, setGuidanceModalDisaster] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedState) return;

    let isMounted = true;

    async function loadAlerts() {
      try {
        const endpoint = `/alerts/nearby?state=${encodeURIComponent(selectedState)}`;
        const response = await fetchFromApi<AlertItem[]>(endpoint);

        if (isMounted) {
          if (response.success && Array.isArray(response.data)) {
            setAlerts(response.data);
            setError(null);
          } else {
            setError(response.message || response.error || 'Failed to load local alerts');
          }
        }
      } catch (err) {
        console.error('Error fetching alerts:', err);
        if (isMounted) {
          setError('Unable to communicate with emergency broadcast service');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, [selectedState, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleScrollToShelters = () => {
    const el = document.getElementById('relief-camps') || document.querySelector('[data-section="relief-camps"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = 'relief-camps';
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return {
          card: 'border-red-200 bg-red-50/50',
          badge: 'bg-red-100 text-red-800 border-red-200',
          iconColor: 'text-red-600',
        };
      case 'medium':
        return {
          card: 'border-amber-200 bg-amber-50/50',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          iconColor: 'text-amber-600',
        };
      case 'low':
      default:
        return {
          card: 'border-blue-200 bg-blue-50/50',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600',
        };
    }
  };

  const getDisasterKey = (title: string, message: string) => {
    const text = `${title} ${message}`.toLowerCase();
    if (text.includes('flood') || text.includes('water') || text.includes('rain')) return 'flood';
    if (text.includes('fire') || text.includes('smoke') || text.includes('burn')) return 'fire';
    if (text.includes('earthquake') || text.includes('tremor') || text.includes('shake')) return 'earthquake';
    return 'general';
  };

  return (
    <section id="emergency-alerts" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-600 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse text-red-500" />
              Live Emergency Broadcasts
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
              {alerts.length} Active
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            Emergency Warnings & Citizen Advisories
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Official government disaster notifications, early warnings, and public safety directions.
          </p>
        </div>

        {/* State Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedState}
              onChange={(e) => {
                setIsLoading(true);
                setSelectedState(e.target.value);
              }}
              className="bg-transparent font-semibold outline-none text-slate-800 cursor-pointer"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-all duration-180 active:scale-95 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-400">
          <RefreshCw className="mb-2 h-6 w-6 animate-spin text-red-500" />
          <p className="text-sm">Tuning in to emergency broadcast channels for {selectedState}...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
          <AlertOctagon className="mb-2 h-8 w-8 text-slate-300" />
          <h4 className="font-bold text-slate-700">No active disaster alerts in {selectedState}</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            No critical weather or evacuation broadcasts have been issued for this region right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {alerts.map((alert) => {
            const styles = getSeverityStyle(alert.severity);
            const disasterKey = getDisasterKey(alert.title, alert.message);

            return (
              <div
                key={alert._id}
                className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${styles.badge}`}
                      >
                        {alert.severity} Priority
                      </span>
                      <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                        {alert.type || 'Official Advisory'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {alert.title}
                    </h4>

                    <p className="text-xs leading-relaxed text-slate-700">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Target: {alert.affectedStates?.join(', ') || 'All Regions'}
                        {alert.affectedDistricts && alert.affectedDistricts.length > 0
                          ? ` (${alert.affectedDistricts.join(', ')})`
                          : ''}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Issued:{' '}
                        {new Date(alert.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    {/* Citizen Action Directives */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuidanceModalDisaster(disasterKey)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200/80 rounded-xl transition-colors active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>View Safety Guidance</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleScrollToShelters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-xl transition-colors active:scale-95"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Find Nearest Shelter</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Public Safety Guidance Modal ─── */}
      {guidanceModalDisaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {SAFETY_GUIDELINES[guidanceModalDisaster]?.title || 'Safety Precautions'}
                  </h3>
                  <p className="text-xs text-slate-500">Official Civil Protection Directive</p>
                </div>
              </div>
              <button
                onClick={() => setGuidanceModalDisaster(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Immediate Actions (DO)</span>
                </h4>
                <ul className="space-y-1.5 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-950">
                  {SAFETY_GUIDELINES[guidanceModalDisaster]?.do.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Critical Hazards to Avoid (DON&apos;T)</span>
                </h4>
                <ul className="space-y-1.5 bg-red-50/60 p-3.5 rounded-2xl border border-red-100 text-xs text-red-950">
                  {SAFETY_GUIDELINES[guidanceModalDisaster]?.dont.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleScrollToShelters}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Locate Designated Shelters &rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuidanceModalDisaster(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
