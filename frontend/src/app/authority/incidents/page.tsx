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
  SlidersHorizontal,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type Tab = 'All' | 'Reported' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'SOS';

export default function IncidentManagementPage() {
  const [viewMode, setViewMode] = useState<'live' | 'analytics'>('live');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  const fetchIncidents = async () => {
    setLoading(true);
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
        setError(res.message || 'Failed to fetch incidents');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [activeTab, page, search, typeFilter, severityFilter]);

  useSocket({
    'new-incident': () => fetchIncidents(),
    'incident-updated': () => fetchIncidents(),
  });

  const handleVerify = async (id: string) => {
    try {
      const res = await fetchFromApi(API_ENDPOINTS.VERIFY_INCIDENT(id), { method: 'PATCH' });
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
            <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => { setActiveTab(tab.label); setPage(1); }}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.label
                      ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} {tab.isSOS && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-red-500" />}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-3 border-b border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, location, district, or ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value as IncidentType); setPage(1); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Incident</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Priority</th>
                      <th className="px-6 py-3.5">Location</th>
                      <th className="px-6 py-3.5">Reported</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidents.map((incident) => (
                      <tr key={incident._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 line-clamp-1 max-w-xs">{incident.title}</span>
                            {incident.isSOS && <SOSIndicator />}
                          </div>
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={incident.severity} />
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
                              {incident.type}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <IncidentStatusBadge status={incident.status} />
                        </td>

                        <td className="px-6 py-4">
                          <PriorityBadge score={incident.priorityScore || 0} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{incident.district}, {incident.state}</span>
                          </div>
                          {incident.address && (
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{incident.address}</p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-700 font-medium">
                            {incident.createdAt ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true }) : 'Recently'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {incident.createdAt ? format(new Date(incident.createdAt), 'PP p') : ''}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {incident.status === 'reported' && (
                              <button
                                onClick={() => handleVerify(incident._id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
                              >
                                Verify
                              </button>
                            )}
                            <Link
                              href={`/authority/incidents/${incident._id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              <span>Details</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
