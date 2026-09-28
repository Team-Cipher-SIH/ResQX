'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  MapPin,
  Clock,
  Radio,
  Send,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditLog {
  _id: string;
  action: string;
  targetType: string;
  targetId?: string;
  description: string;
  performedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    authorityLevel?: string;
    state?: string;
    district?: string;
  } | null;
  incident?: string;
  dispatch?: string;
  state?: string;
  district?: string;
  createdAt: string;
}

interface AuditResponse {
  data: AuditLog[];
  count: number;
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_COLOR_MAP: Record<string, { bg: string; text: string; icon: any }> = {
  incident_reported: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: AlertTriangle },
  incident_verified: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', icon: Shield },
  incident_assigned: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Send },
  incident_resolved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: CheckCircle2 },
  incident_closed: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800', icon: CheckCircle2 },
  dispatch_created: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Send },
  sos_triggered: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: Radio },
  alert_issued: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', icon: Zap },
  default: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', icon: FileText },
};

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', '25');

      if (actionFilter !== 'all') queryParams.set('action', actionFilter);
      if (targetTypeFilter !== 'all') queryParams.set('targetType', targetTypeFilter);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const res = await fetchFromApi<AuditResponse>(`${API_ENDPOINTS.AUDIT_LOGS}?${queryParams.toString()}`);
      if (res.success && res.data) {
        // Support either wrapped envelope or array data
        const logData = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        setLogs(logData);
        setTotalLogs(res.data.total || (res as any).total || logData.length);
        setTotalPages(res.data.totalPages || (res as any).totalPages || 1);
      } else {
        setError(res.message || 'Failed to load audit logs');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with audit service');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetTypeFilter, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Realtime updates
  useSocket({
    'new-incident': () => fetchAuditLogs(),
    'incident-updated': () => fetchAuditLogs(),
    'dispatch-created': () => fetchAuditLogs(),
    'dispatch-updated': () => fetchAuditLogs(),
    'new-alert': () => fetchAuditLogs(),
  });

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.performedBy?.name && log.performedBy.name.toLowerCase().includes(q)) ||
      (log.targetId && log.targetId.toLowerCase().includes(q)) ||
      (log.district && log.district.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader title="Command Audit & Operational Log" subtitle="Cryptographic audit trail of all response actions, dispatches & verifications" />

      <main className="flex-1 p-6 animate-fade-in max-w-7xl mx-auto w-full space-y-6">
        {/* Top Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit actions, descriptions, officers, or target IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="incident_reported">Incident Reported</option>
                <option value="incident_verified">Incident Verified</option>
                <option value="incident_assigned">Incident Assigned</option>
                <option value="incident_resolved">Incident Resolved</option>
                <option value="incident_closed">Incident Closed</option>
                <option value="dispatch_created">Dispatch Created</option>
                <option value="sos_triggered">SOS Triggered</option>
                <option value="alert_issued">Alert Issued</option>
              </select>

              <select
                value={targetTypeFilter}
                onChange={(e) => {
                  setTargetTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Entities</option>
                <option value="incident">Incidents</option>
                <option value="dispatch">Dispatches</option>
                <option value="team">Response Teams</option>
                <option value="alert">Alerts</option>
                <option value="shelter">Shelters</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                disabled={loading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                title="Refresh Audit Log"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading && logs.length === 0 ? (
          <LoadingState message="Querying secure audit ledger..." />
        ) : error ? (
          <ErrorState title="Audit Ledger Error" message={error} onRetry={fetchAuditLogs} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Audit Records Found"
            message="No system audit logs match your filter criteria."
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setActionFilter('all');
                setTargetTypeFilter('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              },
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Action & Entity</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Actor / Official</th>
                    <th className="px-5 py-3.5">Jurisdiction</th>
                    <th className="px-5 py-3.5 text-right">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const actionConfig = ACTION_COLOR_MAP[log.action] || ACTION_COLOR_MAP.default;
                    const Icon = actionConfig.icon;
                    const dateObj = new Date(log.createdAt);

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-slate-900">
                            {format(dateObj, 'PP')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {format(dateObj, 'p')} ({formatDistanceToNow(dateObj, { addSuffix: true })})
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold capitalize ${actionConfig.bg} ${actionConfig.text}`}
                            >
                              <Icon className="w-3 h-3" />
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                            Entity: {log.targetType || 'System'}
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-md">
                          <p className="font-medium text-slate-800 line-clamp-2 whitespace-normal">
                            {log.description}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {log.performedBy ? (
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {log.performedBy.name}
                              </p>
                              <p className="text-[10px] text-slate-500 capitalize">
                                {log.performedBy.role} • {log.performedBy.authorityLevel?.replace('_', ' ') || 'Official'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">System Automation</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{log.district ? `${log.district}, ${log.state || ''}` : log.state || 'National Grid'}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {log.incident ? (
                            <Link
                              href={`/authority/incidents/${log.incident}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold font-mono text-[10px] transition-colors"
                            >
                              <span>Incident</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : log.dispatch ? (
                            <Link
                              href="/authority/dispatches"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold font-mono text-[10px] transition-colors"
                            >
                              <span>Dispatch</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : log.targetId ? (
                            <span className="font-mono text-[10px] text-slate-400">
                              #{log.targetId.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing Page <b>{page}</b> of <b>{totalPages}</b> ({totalLogs} Total Audit Records)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
