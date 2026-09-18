'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { Incident, IncidentStatus, IncidentType, IncidentSeverity } from '@/types/authority';
import { Search, Filter, AlertTriangle, Eye, Shield, Send, MapPin, Clock, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'All' | 'Reported' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'SOS';

export default function IncidentManagementPage() {
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
      const activeTabData = tabs.find(t => t.label === activeTab);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      if (activeTabData?.status) queryParams.append('status', activeTabData.status);
      if (activeTabData?.isSOS) queryParams.append('isSOS', 'true');
      
      if (search) queryParams.append('search', search);
      if (typeFilter) queryParams.append('type', typeFilter);
      if (severityFilter) queryParams.append('severity', severityFilter);

      const res = await fetchFromApi<{ incidents: Incident[], totalPages: number }>(`${API_ENDPOINTS.INCIDENTS}?${queryParams.toString()}`);
      
      if (res.success && res.data) {
        // Handle varying response structures for safety
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader />
      
      <main className="flex-1 p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Incident Management</h1>
              <p className="text-slate-500 mt-1">Manage and track emergency incidents across jurisdictions.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => { setActiveTab(tab.label); setPage(1); }}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.label
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} {tab.isSOS && <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value as IncidentType); setPage(1); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
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
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                {(search || typeFilter || severityFilter) && (
                  <button
                    onClick={() => { setSearch(''); setTypeFilter(''); setSeverityFilter(''); }}
                    className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg transition-colors"
                    title="Clear filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data area */}
          {loading ? (
            <LoadingState message="Loading incidents..." />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchIncidents} />
          ) : incidents.length === 0 ? (
            <EmptyState 
              icon={<Search className="w-12 h-12 text-slate-300" />}
              title="No incidents found"
              message="No incidents match your current filters and tab selection."
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                      <th className="px-4 py-3">ID / Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Severity & Priority</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reported</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidents.map((incident) => (
                      <tr key={incident._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-500">#{incident._id.slice(-6)}</div>
                          <div className="font-medium text-slate-900 text-sm mt-0.5 truncate max-w-[200px]" title={incident.title}>
                            {incident.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                          {incident.type}
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          <SeverityBadge severity={incident.severity} />
                          <div className="mt-1">
                            <PriorityBadge score={incident.priorityScore || 0} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900 truncate max-w-[150px]">{incident.district}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{incident.state}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IncidentStatusBadge status={incident.status} />
                            {incident.isSOS && <SOSIndicator />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {incident.createdAt ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true }) : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Link href={`/authority/incidents/${incident._id}`}>
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          
                          {incident.status === 'reported' && (
                            <button 
                              onClick={() => handleVerify(incident._id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" 
                              title="Verify"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          
                          {incident.status === 'verified' && (
                            <Link href={`/authority/dispatches?incident=${incident._id}`}>
                              <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Dispatch Team">
                                <Send className="w-4 h-4" />
                              </button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
