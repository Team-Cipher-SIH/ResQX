'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi } from '@/lib/api';
import { FileText, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { IncidentItem } from './MyIncidents';
import CountUpNumber from '@/components/ui/CountUpNumber';

interface IncidentSummaryProps {
  incidents?: IncidentItem[];
  refreshKey?: number;
}

export default function IncidentSummary({
  incidents: propIncidents,
  refreshKey = 0,
}: IncidentSummaryProps) {
  const [fetchedIncidents, setFetchedIncidents] = useState<IncidentItem[]>([]);

  useEffect(() => {
    if (propIncidents !== undefined) return;

    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetchFromApi<IncidentItem[]>('/incidents/my-reports');
        if (isMounted && res.success && Array.isArray(res.data)) {
          setFetchedIncidents(res.data);
        }
      } catch (err) {
        console.error('Failed to load summary counts:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [propIncidents, refreshKey]);

  const incidents = propIncidents !== undefined ? propIncidents : fetchedIncidents;
  const total = incidents.length;
  const reportedCount = incidents.filter((i) => !i.status || i.status === 'reported').length;
  const verifiedCount = incidents.filter((i) => i.status === 'verified').length;
  const assignedCount = incidents.filter(
    (i) => i.status === 'assigned' || i.status === 'resolved'
  ).length;

  return (
    <section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Filed */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">My Submissions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 group-hover:scale-105">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              <CountUpNumber value={total} />
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Total reports</span>
          </div>
        </div>

        {/* Pending Triage */}
        <div className="group rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Triage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100/80 text-amber-700 transition-transform duration-200 group-hover:scale-105">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 tracking-tight">
              <CountUpNumber value={reportedCount} />
            </span>
            <span className="text-[11px] text-amber-700 font-medium">Under review</span>
          </div>
        </div>

        {/* Verified */}
        <div className="group rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-700 transition-transform duration-200 group-hover:scale-105">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900 tracking-tight">
              <CountUpNumber value={verifiedCount} />
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Officer verified</span>
          </div>
        </div>

        {/* Assigned */}
        <div className="group rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Dispatched</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100/80 text-blue-700 transition-transform duration-200 group-hover:scale-105">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-900 tracking-tight">
              <CountUpNumber value={assignedCount} />
            </span>
            <span className="text-[11px] text-blue-700 font-medium">Active & resolved</span>
          </div>
        </div>
      </div>
    </section>
  );
}
