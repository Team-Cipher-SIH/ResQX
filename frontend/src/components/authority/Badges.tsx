'use client';

import {
  IncidentStatus,
  IncidentSeverity,
  DispatchStatus,
  TeamStatus,
  PriorityLevel,
  getStatusColor,
  getSeverityColor,
  getDispatchStatusColor,
  getTeamStatusColor,
  getPriorityColor,
  getPriorityLabel,
} from '@/types/authority';
import PulsingDot from '@/components/ui/PulsingDot';

// ─── Status Badge ───

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const colorClass = getStatusColor(status);
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${colorClass}`}
    >
      {status === 'in_progress' && <PulsingDot variant="blue" size="sm" />}
      {status === 'verified' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {status === 'resolved' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status === 'reported' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {label}
    </span>
  );
}

// ─── Severity Badge ───

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const colorClass = getSeverityColor(severity);
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  const isCritical = severity === 'critical';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150 ${colorClass} ${
        isCritical ? 'shadow-xs shadow-red-100' : ''
      }`}
    >
      {isCritical ? (
        <PulsingDot variant="critical" size="sm" />
      ) : severity === 'high' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      ) : severity === 'medium' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      )}
      {label}
    </span>
  );
}

// ─── Priority Badge ───

export function PriorityBadge({
  score,
  level,
}: {
  score?: number;
  level?: PriorityLevel;
}) {
  const resolvedLevel =
    level ||
    (score !== undefined
      ? ((score >= 40 ? 'P0' : score >= 30 ? 'P1' : score >= 20 ? 'P2' : 'P3') as PriorityLevel)
      : ('P3' as PriorityLevel));
  const colorClass = getPriorityColor(resolvedLevel);
  const label = getPriorityLabel(resolvedLevel);
  const isP0 = resolvedLevel === 'P0';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all duration-150 ${colorClass} ${
        isP0 ? 'shadow-xs shadow-red-100 ring-1 ring-red-300/60' : ''
      }`}
    >
      {isP0 && <PulsingDot variant="critical" size="sm" />}
      <span className="font-mono">{resolvedLevel}</span>
      <span className="hidden sm:inline text-slate-300">·</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

// ─── Dispatch Status Badge ───

export function DispatchStatusBadge({ status }: { status: DispatchStatus }) {
  const colorClass = getDispatchStatusColor(status);
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isActiveOperation = ['accepted', 'en_route', 'on_site', 'in_progress'].includes(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${colorClass}`}
    >
      {isActiveOperation && <PulsingDot variant={status === 'in_progress' ? 'warning' : 'blue'} size="sm" />}
      {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {label}
    </span>
  );
}

// ─── Team Status Badge ───

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  const colorClass = getTeamStatusColor(status);
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${colorClass}`}
    >
      <PulsingDot
        variant={status === 'available' ? 'live' : status === 'busy' ? 'busy' : 'offline'}
        size="sm"
      />
      {label}
    </span>
  );
}

// ─── Jurisdiction Badge ───

export function JurisdictionBadge({
  level,
  state,
  district,
}: {
  level: string | null;
  state?: string | null;
  district?: string | null;
}) {
  const levelLabel =
    level?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Authority';

  return (
    <div className="inline-flex items-center gap-2 text-xs">
      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
        {levelLabel}
      </span>
      {state && (
        <span className="text-slate-500 font-medium">
          {district ? `${district}, ${state}` : state}
        </span>
      )}
    </div>
  );
}

// ─── SOS Indicator ───

export function SOSIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200 shadow-xs shadow-red-100">
      <PulsingDot variant="critical" size="sm" />
      SOS
    </span>
  );
}
