'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { SeverityBadge } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { Alert } from '@/types/authority';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';
import {
  Bell,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Filter,
  Search,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  Radio,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function AlertsManagementPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [draftAlerts, setDraftAlerts] = useState<Alert[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewModalAlert, setReviewModalAlert] = useState<Alert | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.message || 'Failed to fetch alerts');
    }
    setLoading(false);
  }, [filterActive]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchDraftAlerts = useCallback(async () => {
    setDraftLoading(true);
    const res = await fetchFromApi<Alert[]>(API_ENDPOINTS.ALERT_DRAFTS);
    if (res.success && res.data) {
      setDraftAlerts(Array.isArray(res.data) ? res.data : []);
    }
    setDraftLoading(false);
  }, []);

  useEffect(() => {
    fetchDraftAlerts();
  }, [fetchDraftAlerts]);

  const handleIssueAlert = async (id: string) => {
    setActionLoadingId(id);
    const res = await fetchFromApi(API_ENDPOINTS.ISSUE_ALERT(id), { method: 'PATCH' });
    if (res.success) {
      if (reviewModalAlert?._id === id) setReviewModalAlert(null);
      await Promise.all([fetchDraftAlerts(), fetchAlerts()]);
    } else {
      alert(res.message || 'Failed to issue alert.');
    }
    setActionLoadingId(null);
  };

  const handleRejectAlert = async (id: string) => {
    if (!window.confirm('Reject this AI-detected draft warning? It will be marked as expired and will not be broadcast to citizens.')) {
      return;
    }
    setActionLoadingId(id);
    const res = await fetchFromApi(API_ENDPOINTS.REJECT_ALERT(id), { method: 'PATCH' });
    if (res.success) {
      if (reviewModalAlert?._id === id) setReviewModalAlert(null);
      await fetchDraftAlerts();
    } else {
      alert(res.message || 'Failed to reject alert.');
    }
    setActionLoadingId(null);
  };

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
    } else {
      alert(res.message || 'Failed to create alert.');
    }
    setSubmitting(false);
  };

  const handleDeactivate = async (id: string) => {
    const res = await fetchFromApi(API_ENDPOINTS.DEACTIVATE_ALERT(id), { method: 'PATCH' });
    if (res.success) fetchAlerts();
  };

  const filteredAlerts = alerts.filter((a) =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <AuthorityHeader
        title="Early Warning & Alert Operations"
        subtitle="Review AI hazard triggers, authorize early warnings & broadcast citizen notifications"
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* ─── Visual Early Warning Workflow Banner ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-600">
                ResQTech Early Warning Pipeline
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                Before → During Early Warning & Alert Review Workflow
              </h3>
            </div>

            <Link
              href="/authority/risk"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Inspect Risk Matrix</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-slate-900">AI Risk Prediction</p>
                <p className="text-[10px] text-slate-500">Environmental sensor triage</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-purple-900">Draft Warning Created</p>
                <p className="text-[10px] text-purple-600">Score &ge; 70 generates draft</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-amber-900">Authority Review</p>
                <p className="text-[10px] text-amber-600">Official verifies veracity</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <p className="font-bold text-emerald-900">Public Warning Live</p>
                <p className="text-[10px] text-emerald-600">Broadcast to citizen apps</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Top Filter & Search Bar ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'inactive', 'pending'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterActive(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                  filterActive === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70 bg-white border border-slate-200'
                }`}
              >
                {tab === 'pending' ? 'Pending Review (Drafts)' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'pending' && draftAlerts.length > 0 && (
                  <span className="ml-1.5 bg-purple-500 text-white text-[10px] font-mono font-black rounded-full px-1.5 py-0.2">
                    {draftAlerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-full sm:w-64 shadow-2xs"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all hover:shadow-xs active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Alert</span>
            </button>
          </div>
        </div>

        {/* ─── Content Section ─── */}
        {filterActive === 'pending' ? (
          draftLoading ? (
            <LoadingState message="Loading pending draft warnings for authority review..." />
          ) : draftAlerts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10 text-slate-300" />}
              title="No pending draft warnings"
              message="All AI-detected hazard alerts have been reviewed or no elevated risk conditions are currently active."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-purple-600" />
                  <span>Draft Warnings Awaiting Authority Action ({draftAlerts.length})</span>
                </p>
                <span className="text-[11px] text-slate-500">AI drafts must be verified before broadcast</span>
              </div>

              {draftAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="p-5 bg-white rounded-2xl border border-purple-200 bg-gradient-to-r from-white via-white to-purple-50/20 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{alert.title}</span>
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          Draft — Awaiting Review
                        </span>
                        {alert.source === 'ai_risk_prediction' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Source: AI Risk Forecaster
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{alert.message}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        {alert.affectedDistricts && alert.affectedDistricts.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Target Districts: {alert.affectedDistricts.join(', ')}
                          </span>
                        )}
                        {alert.affectedStates && alert.affectedStates.length > 0 && (
                          <span className="text-slate-500">
                            State: {alert.affectedStates.join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Generated: {new Date(alert.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <button
                        onClick={() => setReviewModalAlert(alert)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review Details</span>
                      </button>

                      <button
                        onClick={() => handleIssueAlert(alert._id)}
                        disabled={actionLoadingId === alert._id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {actionLoadingId === alert._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Issue Warning</span>
                      </button>

                      <button
                        onClick={() => handleRejectAlert(alert._id)}
                        disabled={actionLoadingId === alert._id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading ? (
          <LoadingState message="Loading disaster broadcast records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAlerts} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-10 h-10 text-slate-300" />}
            title="No alerts found"
            message={searchTerm ? 'No alerts match your search query.' : 'No active alerts have been broadcast yet.'}
          />
        ) : (
          <div className="space-y-3.5">
            {filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-5 bg-white rounded-2xl border shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  alert.isActive
                    ? alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50/15'
                      : alert.severity === 'high'
                      ? 'border-amber-200 bg-amber-50/15'
                      : 'border-slate-200'
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-base">{alert.title}</span>
                      <SeverityBadge severity={alert.severity} />
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          alert.type === 'warning'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : alert.type === 'watch'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {alert.type}
                      </span>
                      {alert.source === 'ai_risk_prediction' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Source: AI Forecast
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          alert.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {alert.isActive ? 'Status: Active Broadcast' : 'Status: Deactivated / Expired'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      {alert.affectedStates && alert.affectedStates.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Target: {alert.affectedStates.join(', ')}
                          {alert.affectedDistricts && alert.affectedDistricts.length > 0
                            ? ` (${alert.affectedDistricts.join(', ')})`
                            : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Issued: {new Date(alert.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {alert.isActive && (
                    <button
                      onClick={() => handleDeactivate(alert._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 active:scale-95 shrink-0"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Draft Alert Detailed Review Modal ─── */}
      {reviewModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Review Draft Early Warning</h3>
                  <p className="text-xs text-slate-500">Validate AI-generated advisory before broadcasting</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Alert Title
                </span>
                <p className="font-bold text-slate-900 text-sm">{reviewModalAlert.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Warning Message
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {reviewModalAlert.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Severity</span>
                  <div className="mt-1">
                    <SeverityBadge severity={reviewModalAlert.severity} />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Advisory Type</span>
                  <p className="font-bold text-slate-800 capitalize mt-1">{reviewModalAlert.type}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Geographical Scope</span>
                <p className="text-slate-800 font-semibold">
                  Districts: {reviewModalAlert.affectedDistricts?.join(', ') || 'District Wide'}
                </p>
                <p className="text-slate-500">
                  State: {reviewModalAlert.affectedStates?.join(', ') || 'State Wide'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRejectAlert(reviewModalAlert._id)}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                >
                  Reject Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleIssueAlert(reviewModalAlert._id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Issue & Broadcast</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Alert Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Broadcast Authority Alert</h2>
                <p className="text-xs text-slate-500">Manual emergency advisory for affected citizens</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="e.g. Flash Flood Advisory — Mutha Basin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Message *</label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
                  placeholder="Detailed public warning instructions, safe zones, and helpline details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Advisory Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as typeof formType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="advisory">Advisory (General)</option>
                    <option value="watch">Watch (Elevated)</option>
                    <option value="warning">Warning (Immediate Hazard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as typeof formSeverity)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
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
                <select
                  value={formSelectedState}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSelectedState(val);
                    if (val && !formStates.includes(val)) setFormStates([...formStates, val]);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select state...</option>
                  {getStateNames().map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {formStates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formStates.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                        {s}
                        <button type="button" onClick={() => setFormStates(formStates.filter((x) => x !== s))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                <span>{submitting ? 'Broadcasting...' : 'Broadcast Alert'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}