'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { Incident, IncidentStatus, IncidentType, IncidentSeverity } from '@/types/authority';
import {
  Search,
  Filter,
  AlertTriangle,
  Eye,
  Shield,
  Send,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Activity,
  Layers,
  ArrowUpRight,
  Truck,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type Tab = 'All' | 'Reported' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'SOS';

export default function IncidentManagementPage() {
  const [viewMode, setViewMode] = useState<'live' | 'analytics'>('live');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<IncidentType | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const tabs: { label: Tab; status?: IncidentStatus; isSOS?: boolean }[] = [
    { label: 'All' },
    { label: 'Reported', status: 'reported' },
    { label: 'Verified', status: 'verified' },
    { label: 'Assigned', status: 'assigned' },
    { label: 'In Progress', status: 'in_progress' },
    { label: 'Resolved', status: 'resolved' },
    { label: 'Closed', status: 'closed' },
    { label: 'SOS', isSOS: true },
  ];

  const fetchIncidents = async (silent = false) => {
    if (!silent && incidents.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const activeTabData = tabs.find((t) => t.label === activeTab);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      if (activeTabData?.status) queryParams.append('status', activeTabData.status);
      if (activeTabData?.isSOS) queryParams.append('isSOS', 'true');
      
      if (search) queryParams.append('search', search);
      if (typeFilter) queryParams.append('type', typeFilter);
      if (severityFilter) queryParams.append('severity', severityFilter);

      const res = await fetchFromApi<{ incidents: Incident[]; totalPages: number }>(`${API_ENDPOINTS.INCIDENTS}?${queryParams.toString()}`);
      
      if (res.success && res.data) {
        const data = res.data;
        if (Array.isArray(data)) {
          setIncidents(data);
          setTotalPages(1);
        } else if (data.incidents) {
          setIncidents(data.incidents);
          setTotalPages(data.totalPages || 1);
        }
      } else {
        if (!silent) setError(res.message || 'Failed to fetch incidents');
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Error fetching incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents(false);
  }, [activeTab, page, search, typeFilter, severityFilter]);

  // Realtime Socket.IO Listeners: Event-driven SILENT update with zero flicker or spinner
  useSocket({
    'new-incident': () => fetchIncidents(true),
    'incident-created': () => fetchIncidents(true),
    'sos-alert': () => fetchIncidents(true),
    'incident-updated': () => fetchIncidents(true),
    'incident-status-changed': () => fetchIncidents(true),
  });

  const handleVerify = async (id: string) => {
    try {
      const res = await fetchFromApi(API_ENDPOINTS.VERIFY_INCIDENT(id), {
        method: 'PATCH',
        body: JSON.stringify({ note: 'Verified by Authority Officer' }),
      });
      if (res.success) {
        fetchIncidents();
      } else {
        alert(res.message || 'Failed to verify incident');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying incident');
    }
  };

  // Safely derived analytics metrics from real incident records
  const historicalMetrics = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter((i) => ['resolved', 'closed'].includes(i.status)).length;
    const active = total - resolved;
    const critical = incidents.filter((i) => i.severity === 'critical' || i.isSOS).length;

    // Calculate average resolution time for resolved incidents
    let totalDurationMin = 0;
    let resolvedCountWithDates = 0;

    incidents.forEach((i) => {
      if (['resolved', 'closed'].includes(i.status) && i.createdAt && i.updatedAt) {
        const dur = (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / 60000;
        if (dur > 0 && dur < 10080) { // under 7 days
          totalDurationMin += dur;
          resolvedCountWithDates++;
        }
      }
    });

    const avgResolutionMin = resolvedCountWithDates > 0 ? Math.round(totalDurationMin / resolvedCountWithDates) : null;

    // Type counts
    const typeMap: Record<string, number> = { flood: 0, fire: 0, earthquake: 0, landslide: 0, cyclone: 0, other: 0 };
    incidents.forEach((i) => {
      const t = (i.type || 'other').toLowerCase();
      if (typeMap[t] !== undefined) typeMap[t]++;
      else typeMap.other++;
    });

    // Severity counts
    const severityMap: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    incidents.forEach((i) => {
      const s = (i.severity || 'low').toLowerCase();
      if (severityMap[s] !== undefined) severityMap[s]++;
    });

    return {
      total,
      resolved,
      active,
      critical,
      avgResolutionMin,
      typeMap,
      severityMap,
    };
  }, [incidents]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader />
      
      <main className="flex-1 p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Incident Command & Historical Archive</h1>
              <p className="text-slate-500 mt-1">Real-time incident management, historical audits, and response velocity analytics.</p>
            </div>

            <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300 shrink-0">
              <button
                onClick={() => setViewMode('live')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'live' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Incidents
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Historical Insights</span>
              </button>
            </div>
          </div>

          {/* Historical Insights Panel */}
          {viewMode === 'analytics' && (
            <div className="space-y-5 animate-fade-in">
              {/* Top Analytics KPI Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Historical Total</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">{historicalMetrics.total}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">Logged incident records</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Resolved & Secured</p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{historicalMetrics.resolved}</h3>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {historicalMetrics.total > 0 ? `${Math.round((historicalMetrics.resolved / historicalMetrics.total) * 100)}% resolution rate` : '0%'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Avg Resolution Time</p>
                  <h3 className="text-2xl font-black text-blue-700 mt-0.5">
                    {historicalMetrics.avgResolutionMin ? `${historicalMetrics.avgResolutionMin}m` : 'Live'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Derived from status history</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Critical / SOS</p>
                  <h3 className="text-2xl font-black text-red-700 mt-0.5">{historicalMetrics.critical}</h3>
                  <span className="text-[10px] text-red-600 font-medium">Urgent life-safety incidents</span>
                </div>
              </div>

              {/* Breakdown Distribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Disaster Hazard Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Incident Distribution by Hazard Type</h3>
                  <div className="space-y-2.5">
                    {Object.entries(historicalMetrics.typeMap).map(([hazard, count]) => {
                      const pct = historicalMetrics.total > 0 ? Math.round((count / historicalMetrics.total) * 100) : 0;
                      return (
                        <div key={hazard} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="capitalize text-slate-800">{hazard}</span>
                            <span className="text-slate-600">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hazard === 'flood' ? 'bg-blue-600' : hazard === 'fire' ? 'bg-orange-600' : hazard === 'earthquake' ? 'bg-amber-600' : 'bg-slate-600'
                              }`}
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Severity Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Incident Distribution by Severity</h3>
                  <div className="space-y-2.5">
                    {Object.entries(historicalMetrics.severityMap).map(([sev, count]) => {
                      const pct = historicalMetrics.total > 0 ? Math.round((count / historicalMetrics.total) * 100) : 0;
                      return (
                        <div key={sev} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="capitalize text-slate-800">{sev} Severity</span>
                            <span className="text-slate-600">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                sev === 'critical' ? 'bg-red-600' : sev === 'high' ? 'bg-orange-500' : sev === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div
              className="flex overflow-x-auto border-b border-slate-200 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => { setActiveTab(tab.label); setPage(1); }}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.label
                      ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} {tab.isSOS && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-red-500 animate-pulse" />}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="p-3.5 sm:p-4 bg-slate-50/60 flex flex-col md:flex-row gap-2.5 sm:gap-3 border-b border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, location, district, or ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value as IncidentType); setPage(1); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="">All Hazard Types</option>
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="landslide">Landslide</option>
                  <option value="cyclone">Cyclone</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={severityFilter}
                  onChange={(e) => { setSeverityFilter(e.target.value as IncidentSeverity); setPage(1); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Content List / Table */}
            {loading ? (
              <div className="p-8"><LoadingState message="Loading incidents & operational status..." /></div>
            ) : error ? (
              <div className="p-8"><ErrorState title="Incident Query Error" message={error} onRetry={fetchIncidents} /></div>
            ) : incidents.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={AlertTriangle}
                  title="No Incidents Found"
                  message="There are no incident records matching your active filters."
                  action={{
                    label: 'Reset Filters',
                    onClick: () => {
                      setActiveTab('All');
                      setSearch('');
                      setTypeFilter('');
                      setSeverityFilter('');
                    },
                  }}
                />
              </div>
            ) : (
              <>
                {/* 1. Mobile & Split-Screen Responsive Card View */}
                <div className="block lg:hidden divide-y divide-slate-100">
                  {incidents.map((incident) => (
                    <div key={incident._id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{incident.title}</span>
                            {incident.isSOS && <SOSIndicator />}
                            {((incident.reportCount ?? 1) > 1) && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full animate-pulse shadow-2xs">
                                🚨 {incident.reportCount} Reports Aggregated
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <SeverityBadge severity={incident.severity} />
                            <span className="font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
                              {incident.type}
                            </span>
                            <span className="text-slate-400">
                              {incident.createdAt ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true }) : 'Recently'}
                            </span>
                          </div>
                        </div>

                        <IncidentStatusBadge status={incident.status} />
                      </div>

                      {/* Location & GPS */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${incident.isSOS ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                          <span className="truncate">{incident.district || 'Auto Grid'}, {incident.state || 'India'}</span>
                        </div>
                        {incident.address && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{incident.address}</p>
                        )}
                        {incident.location?.coordinates && Array.isArray(incident.location.coordinates) && incident.location.coordinates.length === 2 && (
                          <div className="flex items-center justify-between pt-1 font-mono text-[10px]">
                            <span className="bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {incident.location.coordinates[1].toFixed(4)}°N, {incident.location.coordinates[0].toFixed(4)}°E
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${incident.location.coordinates[1]},${incident.location.coordinates[0]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-sans font-bold flex items-center gap-0.5"
                            >
                              Open Maps <ArrowUpRight className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <PriorityBadge score={incident.priorityScore || 0} />
                        <div className="flex items-center gap-2">
                          {incident.status === 'reported' && (
                            <button
                              onClick={() => handleVerify(incident._id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                            >
                              Verify
                            </button>
                          )}
                          <Link
                            href={`/authority/incidents/${incident._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                          >
                            <span>Details</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop High-Density Table View */}
                <div className="hidden lg:block overflow-x-auto relative">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="w-9 px-3 py-3.5 text-center"></th>
                        <th className="px-5 py-3.5 min-w-[240px] max-w-[340px]">Incident</th>
                        <th className="px-4 py-3.5 w-[110px]">Status</th>
                        <th className="px-4 py-3.5 w-[110px]">Priority</th>
                        <th className="px-5 py-3.5 min-w-[220px]">Location</th>
                        <th className="px-4 py-3.5 w-[120px]">Reported</th>
                        <th className="px-4 py-3.5 w-[140px] text-right sticky right-0 z-20 bg-slate-50/95 backdrop-blur-xs shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] border-l border-slate-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incidents.map((incident) => {
                        const isExpanded = expandedId === incident._id;
                        return (
                          <React.Fragment key={incident._id}>
                            <tr
                              onClick={() => toggleExpand(incident._id)}
                              className={`group cursor-pointer transition-colors duration-150 ${
                                isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Toggle Chevron */}
                              <td className="w-9 px-3 py-3.5 text-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 mx-auto text-blue-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 mx-auto" />
                                )}
                              </td>

                              {/* Incident Info */}
                              <td className="px-5 py-3.5 min-w-[240px] max-w-[340px]">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                                      title={incident.title}
                                    >
                                      {incident.title}
                                    </span>
                                    {incident.isSOS && <SOSIndicator />}
                                    {((incident.reportCount ?? 1) > 1) && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full animate-pulse shadow-2xs shrink-0">
                                        🚨 {incident.reportCount} Reports
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <SeverityBadge severity={incident.severity} />
                                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
                                      {incident.type}
                                    </span>
                                    <span className="text-[10px] text-blue-600 font-semibold group-hover:underline">
                                      {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <IncidentStatusBadge status={incident.status} />
                              </td>

                              {/* Priority */}
                              <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <PriorityBadge score={incident.priorityScore || 0} />
                              </td>

                              {/* Location */}
                              <td className="px-5 py-3.5 min-w-[220px]">
                                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${incident.isSOS ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                                  <span className="truncate">{incident.district || 'Auto Grid'}, {incident.state || 'India'}</span>
                                </div>
                                {incident.location?.coordinates && Array.isArray(incident.location.coordinates) && incident.location.coordinates.length === 2 && (
                                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                      {incident.location.coordinates[1].toFixed(4)}°N, {incident.location.coordinates[0].toFixed(4)}°E
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps?q=${incident.location.coordinates[1]},${incident.location.coordinates[0]}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-sans font-bold flex items-center gap-0.5"
                                      title="Open GPS fix in Google Maps"
                                    >
                                      Maps <ArrowUpRight className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                )}
                                {incident.address && (
                                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={incident.address}>{incident.address}</p>
                                )}
                              </td>

                              {/* Reported */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="text-slate-700 font-medium">
                                  {incident.createdAt ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true }) : 'Recently'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {incident.createdAt ? format(new Date(incident.createdAt), 'PP p') : ''}
                                </div>
                              </td>

                              {/* Actions - STICKY RIGHT COLUMN */}
                              <td
                                className="px-4 py-3.5 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] border-l border-slate-100 whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  {incident.status === 'reported' && (
                                    <button
                                      onClick={() => handleVerify(incident._id)}
                                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-2xs"
                                      title="Verify Incident"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  <Link
                                    href={`/authority/incidents/${incident._id}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors"
                                    title="Open full incident record"
                                  >
                                    <span>Details</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              </td>
                            </tr>

                            {/* Inline Expandable Detail Drawer */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-y border-slate-200/90">
                                <td colSpan={7} className="p-4 sm:p-5">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                            INCIDENT ID: {incident._id}
                                          </span>
                                          {incident.isSOS && <SOSIndicator />}
                                          {((incident.reportCount ?? 1) > 1) && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                              🚨 {incident.reportCount} Aggregated Reports
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{incident.title}</h3>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <SeverityBadge severity={incident.severity} />
                                        <IncidentStatusBadge status={incident.status} />
                                        <PriorityBadge score={incident.priorityScore || 0} />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                      {/* 1. Description */}
                                      <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Report Narrative & Details</span>
                                        </div>
                                        <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                                          {incident.description || 'No additional narrative provided with this incident alert.'}
                                        </p>
                                      </div>

                                      {/* 2. Geospatial Location */}
                                      <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                          <MapPin className="w-3.5 h-3.5 text-red-600" />
                                          <span>Precise Location & Maps Fix</span>
                                        </div>
                                        <p className="text-slate-900 font-semibold">{incident.district || 'Auto Grid'}, {incident.state || 'India'}</p>
                                        <p className="text-slate-500 text-[11px] leading-snug">{incident.address || 'Address lookup pending'}</p>
                                        {incident.location?.coordinates && (
                                          <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
                                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                                              {incident.location.coordinates[1].toFixed(5)}°N, {incident.location.coordinates[0].toFixed(5)}°E
                                            </span>
                                            <a
                                              href={`https://www.google.com/maps?q=${incident.location.coordinates[1]},${incident.location.coordinates[0]}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 font-sans font-bold flex items-center gap-1"
                                            >
                                              Google Maps <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </div>
                                        )}
                                      </div>

                                      {/* 3. Reporting Source & Audit */}
                                      <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                          <User className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Reporter & Source</span>
                                        </div>
                                        <p className="text-slate-800 font-medium">
                                          {typeof incident.reportedBy === 'object' && incident.reportedBy?.name 
                                            ? incident.reportedBy.name 
                                            : (incident.isSOS ? 'Citizen 1-Tap SOS Emergency Beacon' : 'Direct Field Reporting')}
                                        </p>
                                        {typeof incident.reportedBy === 'object' && incident.reportedBy?.phone && (
                                          <p className="text-slate-600 text-[11px] flex items-center gap-1">
                                            <span>📞 {incident.reportedBy.phone}</span>
                                          </p>
                                        )}
                                        <p className="text-slate-400 text-[11px]">
                                          Logged: {incident.createdAt ? format(new Date(incident.createdAt), 'PPP p') : 'Recently'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Bottom Quick Action Bar inside Drawer */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">Instant Command Actions:</span>
                                        {incident.status === 'reported' && (
                                          <button
                                            onClick={() => handleVerify(incident._id)}
                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Verify Incident
                                          </button>
                                        )}
                                        <Link
                                          href={`/authority/dispatches?incidentId=${incident._id}`}
                                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          Dispatch Rescue Squad
                                        </Link>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => toggleExpand(incident._id)}
                                          className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors"
                                        >
                                          Collapse ▲
                                        </button>
                                        <Link
                                          href={`/authority/incidents/${incident._id}`}
                                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                                        >
                                          <span>Full Incident Dossier</span>
                                          <ArrowUpRight className="w-3.5 h-3.5" />
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Page <b>{page}</b> of <b>{totalPages}</b></span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
