'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi } from '@/lib/api';
import { AlertOctagon, Radio, MapPin, Calendar, RefreshCw, AlertCircle, Filter } from 'lucide-react';

export interface AlertItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
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

export default function EmergencyAlerts() {
  const [selectedState, setSelectedState] = useState<string>('Uttar Pradesh');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          card: 'border-red-300 bg-red-50/70',
          badge: 'bg-red-100 text-red-800 border-red-300',
          iconColor: 'text-red-600',
        };
      case 'medium':
        return {
          card: 'border-amber-300 bg-amber-50/70',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          iconColor: 'text-amber-600',
        };
      case 'low':
      default:
        return {
          card: 'border-blue-200 bg-blue-50/60',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600',
        };
    }
  };

  return (
    <section id="emergency-alerts" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-600 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse text-red-500" />
              Live Emergency Feeds
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
              {alerts.length} Active
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            Emergency Warnings & Broadcasts
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Official government disaster notifications, early warnings, and evacuation alerts.
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

            return (
              <div
                key={alert._id}
                className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${styles.badge}`}
                      >
                        {alert.severity} Priority
                      </span>
                      <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                        {alert.type || 'Alert'}
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
