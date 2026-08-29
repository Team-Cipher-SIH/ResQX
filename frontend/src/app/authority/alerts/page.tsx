'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { SeverityBadge } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { Alert } from '@/types/authority';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';
import {
  Bell, Plus, X, CheckCircle2, AlertTriangle, Eye, EyeOff, Clock,
  MapPin, Filter, Search, Loader2,
} from 'lucide-react';

export default function AlertsManagementPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<'warning' | 'watch' | 'advisory'>('advisory');
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [formStates, setFormStates] = useState<string[]>([]);
  const [formDistricts, setFormDistricts] = useState<string[]>([]);
  const [formSelectedState, setFormSelectedState] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filterActive === 'active') params.set('isActive', 'true');
    if (filterActive === 'inactive') params.set('isActive', 'false');
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.ALERTS}?${queryString}` : API_ENDPOINTS.ALERTS;
    const res = await fetchFromApi<Alert[]>(endpoint);
    if (res.success && res.data) {
      setAlerts(res.data);
    } else {
      setError(res.message || 'Failed to fetch alerts');
    }
    setLoading(false);
  }, [filterActive]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formMessage) return;
    setSubmitting(true);
    const res = await fetchFromApi(API_ENDPOINTS.ALERTS, {
      method: 'POST',
      body: JSON.stringify({
        title: formTitle,
        message: formMessage,
        type: formType,
        severity: formSeverity,
        affectedStates: formStates,
        affectedDistricts: formDistricts,
      }),
    });
    if (res.success) {
      setShowCreate(false);
      setFormTitle('');
      setFormMessage('');
      setFormStates([]);
      setFormDistricts([]);
      fetchAlerts();
    }
    setSubmitting(false);
  };

  const handleDeactivate = async (id: string) => {
    const res = await fetchFromApi(API_ENDPOINTS.DEACTIVATE_ALERT(id), { method: 'PATCH' });
    if (res.success) fetchAlerts();
  };

  const filteredAlerts = alerts.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AuthorityHeader title="Alert Management" subtitle="Create and manage emergency alerts" />

      <div className="p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(['all', 'active', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterActive(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterActive === tab
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-64"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-180 hover:shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading alerts..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAlerts} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-10 h-10 text-slate-300" />}
            title="No alerts found"
            message={searchTerm ? 'No alerts match your search.' : 'No alerts have been issued yet.'}
          />
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-5 bg-white rounded-xl border shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  alert.isActive
                    ? alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50/20'
                      : alert.severity === 'high'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200'
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{alert.title}</span>
                      <SeverityBadge severity={alert.severity} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        alert.type === 'warning' ? 'bg-red-100 text-red-700' :
                        alert.type === 'watch' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {alert.type}
                      </span>
                      {!alert.isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                      {alert.affectedStates && alert.affectedStates.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.affectedStates.join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                  {alert.isActive && (
                    <button
                      onClick={() => handleDeactivate(alert._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 active:scale-95"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create Alert</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Title *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="e.g. Flood Warning - Indore District" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Message *</label>
                <textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} required rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
                  placeholder="Detailed alert message..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Type</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as typeof formType)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="advisory">Advisory</option>
                    <option value="watch">Watch</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Severity</label>
                  <select value={formSeverity} onChange={(e) => setFormSeverity(e.target.value as typeof formSeverity)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target State <span className="normal-case font-normal text-slate-400">(leave empty for nationwide)</span>
                </label>
                <select value={formSelectedState} onChange={(e) => {
                  const val = e.target.value;
                  setFormSelectedState(val);
                  if (val && !formStates.includes(val)) setFormStates([...formStates, val]);
                }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">Select state...</option>
                  {getStateNames().map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {formStates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formStates.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {s}
                        <button type="button" onClick={() => setFormStates(formStates.filter((x) => x !== s))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                {submitting ? 'Creating...' : 'Create Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
