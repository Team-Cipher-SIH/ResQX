'use client';

import { CheckCircle2, Clock, ArrowRight, AlertTriangle, MapPin, Truck, Wrench, Shield, Check } from 'lucide-react';
import type { StatusHistoryEntry } from '@/types/authority';

const statusConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    activeBg: string;
    completedBg: string;
    label: string;
  }
> = {
  reported: { icon: AlertTriangle, activeBg: 'bg-amber-500 text-white ring-4 ring-amber-100', completedBg: 'bg-amber-100 text-amber-700', label: 'Reported' },
  verified: { icon: Shield, activeBg: 'bg-blue-600 text-white ring-4 ring-blue-100', completedBg: 'bg-blue-100 text-blue-700', label: 'Verified' },
  assigned: { icon: ArrowRight, activeBg: 'bg-indigo-600 text-white ring-4 ring-indigo-100', completedBg: 'bg-indigo-100 text-indigo-700', label: 'Assigned' },
  accepted: { icon: CheckCircle2, activeBg: 'bg-blue-600 text-white ring-4 ring-blue-100', completedBg: 'bg-blue-100 text-blue-700', label: 'Accepted' },
  en_route: { icon: Truck, activeBg: 'bg-indigo-600 text-white ring-4 ring-indigo-100', completedBg: 'bg-indigo-100 text-indigo-700', label: 'En Route' },
  on_site: { icon: MapPin, activeBg: 'bg-purple-600 text-white ring-4 ring-purple-100', completedBg: 'bg-purple-100 text-purple-700', label: 'On Site' },
  in_progress: { icon: Wrench, activeBg: 'bg-orange-500 text-white ring-4 ring-orange-100', completedBg: 'bg-orange-100 text-orange-700', label: 'In Progress' },
  resolved: { icon: CheckCircle2, activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-100', completedBg: 'bg-emerald-100 text-emerald-700', label: 'Resolved' },
  closed: { icon: CheckCircle2, activeBg: 'bg-slate-600 text-white ring-4 ring-slate-100', completedBg: 'bg-slate-100 text-slate-700', label: 'Closed' },
  completed: { icon: CheckCircle2, activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-100', completedBg: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  rejected: { icon: AlertTriangle, activeBg: 'bg-red-500 text-white ring-4 ring-red-100', completedBg: 'bg-red-100 text-red-700', label: 'Rejected' },
  cancelled: { icon: AlertTriangle, activeBg: 'bg-slate-500 text-white ring-4 ring-slate-100', completedBg: 'bg-slate-100 text-slate-700', label: 'Cancelled' },
  pending: { icon: Clock, activeBg: 'bg-amber-500 text-white ring-4 ring-amber-100', completedBg: 'bg-amber-100 text-amber-700', label: 'Pending' },
};

interface IncidentTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: string;
}

export default function IncidentTimeline({ history, currentStatus }: IncidentTimelineProps) {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="relative pl-1">
      {sortedHistory.map((entry, index) => {
        const config = statusConfig[entry.status] || statusConfig.reported;
        const Icon = config.icon;
        const isLast = index === sortedHistory.length - 1;
        const isCurrent = entry.status === currentStatus;
        const isPast = !isCurrent && index < sortedHistory.length - 1;
        const updatedByName =
          typeof entry.updatedBy === 'object' && entry.updatedBy
            ? entry.updatedBy.name
            : null;

        return (
          <div key={index} className="flex gap-3.5 mb-0 group">
            {/* Step Marker & Connector Line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCurrent
                    ? `${config.activeBg} shadow-sm font-bold scale-105`
                    : isPast
                    ? `${config.completedBg} border border-slate-200`
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isPast ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-9 my-1 transition-colors duration-300 ${
                    isPast || isCurrent ? 'bg-blue-200' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-0.5 pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-semibold tracking-tight ${
                    isCurrent ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {config.label}
                </p>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Current
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(entry.timestamp).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>

              {updatedByName && (
                <p className="text-xs text-slate-500 mt-0.5">by {updatedByName}</p>
              )}

              {entry.note && (
                <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                  {entry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
