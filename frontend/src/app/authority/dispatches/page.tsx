'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, DispatchStatusBadge, TeamStatusBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { Dispatch, Incident, ResponseTeam } from '@/types/authority';
import {
  Send,
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Plus,
  Eye,
  Filter,
  Search,
  X,
  Zap,
  Play,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  Radio,
  ArrowUpRight,
  Navigation2,
} from 'lucide-react';
import { format } from 'date-fns';

type DispatchTab = 'active' | 'pending' | 'in_progress' | 'completed';

const ALLOWED_NEXT_STATUS: Record<string, { label: string; status: string; color: string; icon: any }[]> = {
  pending: [
    { label: 'Accept Dispatch', status: 'accepted', color: 'bg-blue-600 hover:bg-blue-700 text-white', icon: CheckCircle2 },
    { label: 'Cancel Dispatch', status: 'cancelled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  ],
  accepted: [
    { label: 'Set En Route', status: 'en_route', color: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: Truck },
    { label: 'Cancel Dispatch', status: 'cancelled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  ],
  en_route: [
    { label: 'Arrived On Site', status: 'on_site', color: 'bg-amber-600 hover:bg-amber-700 text-white', icon: MapPin },
    { label: 'Cancel Dispatch', status: 'cancelled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  ],
  on_site: [
    { label: 'Start In Progress', status: 'in_progress', color: 'bg-orange-600 hover:bg-orange-700 text-white', icon: Play },
    { label: 'Cancel Dispatch', status: 'cancelled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  ],
  in_progress: [
    { label: 'Complete Dispatch', status: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: CheckCircle },
    { label: 'Cancel Dispatch', status: 'cancelled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  ],
  completed: [],
  cancelled: [],
  rejected: [],
};

function DispatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incidentIdParam = searchParams.get('incident');

  const [activeTab, setActiveTab] = useState<DispatchTab>('active');
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Dispatch State
  const [showCreatePanel, setShowCreatePanel] = useState(!!incidentIdParam);
  const [targetIncident, setTargetIncident] = useState<Incident | null>(null);
  const [availableIncidents, setAvailableIncidents] = useState<Incident[]>([]);
  const [availableTeams, setAvailableTeams] = useState<ResponseTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [loadingIncident, setLoadingIncident] = useState(!!incidentIdParam);
  const [loadingAvailableIncidents, setLoadingAvailableIncidents] = useState(false);

  // Status transition modal
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    dispatchId: string;
    nextStatus: string;
    actionLabel: string;
    note: string;
  }>({
    isOpen: false,
    dispatchId: '',
    nextStatus: '',
    actionLabel: '',
    note: '',
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Dispatch Detail Drawer/Modal
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      let statusQuery = '';
      if (activeTab === 'active') {
        statusQuery = '?status=pending,accepted,en_route,on_site,in_progress';
      } else if (activeTab === 'pending') {
        statusQuery = '?status=pending,accepted';
      } else if (activeTab === 'in_progress') {
        statusQuery = '?status=en_route,on_site,in_progress';
      } else if (activeTab === 'completed') {
        statusQuery = '?status=completed,cancelled,rejected';
      }

      const res = await fetchFromApi<Dispatch[]>(`${API_ENDPOINTS.DISPATCHES}${statusQuery}`);
      if (res.success && res.data) {
        setDispatches(res.data);
      } else {
        setError(res.message || 'Failed to fetch dispatches');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching dispatches');
    } finally {
      setLoading(false);
    }
  };

  // Realtime updates
  useSocket({
    'dispatch-created': () => fetchDispatches(),
    'dispatch-updated': () => fetchDispatches(),
    'team-updated': () => fetchDispatches(),
    'incident-updated': () => fetchDispatches(),
  });

  useEffect(() => {
    fetchDispatches();
  }, [activeTab]);

  useEffect(() => {
    if (incidentIdParam) {
      loadIncidentForDispatch(incidentIdParam);
    }
  }, [incidentIdParam]);

  const loadIncidentForDispatch = async (id: string) => {
    setShowCreatePanel(true);
    setLoadingIncident(true);
    try {
      const res = await fetchFromApi<Incident>(API_ENDPOINTS.INCIDENT_DETAIL(id));
      if (res.success && res.data) {
        setTargetIncident(res.data);
        await loadTeamsForDistrict(res.data.district, res.data._id);
      }
    } catch (err) {
      console.error('Failed to load incident for dispatch', err);
    } finally {
      setLoadingIncident(false);
    }
  };

  const loadTeamsForDistrict = async (district: string, incidentId?: string) => {
    try {
      // Try recommended teams endpoint if incidentId is provided
      if (incidentId) {
        const recRes = await fetchFromApi<{ recommendedTeams?: ResponseTeam[]; teams?: ResponseTeam[] }>(
          `/dispatches/recommend/${incidentId}`
        );
        if (recRes.success && (recRes.data?.recommendedTeams || recRes.data?.teams || Array.isArray(recRes.data))) {
          const list = recRes.data?.recommendedTeams || recRes.data?.teams || (Array.isArray(recRes.data) ? recRes.data : []);
          if (list.length > 0) {
            setAvailableTeams(list);
            return;
          }
        }
      }

      // Fallback to fetching available teams in district
      const teamsRes = await fetchFromApi<ResponseTeam[]>(
        `${API_ENDPOINTS.TEAMS}?status=available&district=${encodeURIComponent(district)}`
      );
      if (teamsRes.success && teamsRes.data) {
        setAvailableTeams(teamsRes.data);
      }
    } catch (e) {
      console.warn('Failed to load recommended teams', e);
    }
  };

  const openCreateModal = async () => {
    setShowCreatePanel(true);
    if (!targetIncident) {
      setLoadingAvailableIncidents(true);
      try {
        const res = await fetchFromApi<Incident[]>(`${API_ENDPOINTS.INCIDENTS}?status=verified`);
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data as any).incidents || [];
          setAvailableIncidents(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAvailableIncidents(false);
      }
    }
  };

  const handleSelectIncident = async (inc: Incident) => {
    setTargetIncident(inc);
    setSelectedTeamId('');
    await loadTeamsForDistrict(inc.district, inc._id);
  };

  const handleCreateDispatch = async () => {
    if (!targetIncident || !selectedTeamId) return;
    
    setIsDispatching(true);
    try {
      const res = await fetchFromApi(API_ENDPOINTS.DISPATCHES, {
        method: 'POST',
        body: JSON.stringify({
          incidentId: targetIncident._id,
          teamId: selectedTeamId,
          notes: dispatchNotes,
        }),
      });

      if (res.success) {
        setShowCreatePanel(false);
        setTargetIncident(null);
        setSelectedTeamId('');
        setDispatchNotes('');
        router.push('/authority/dispatches');
        fetchDispatches();
      } else {
        alert(res.message || 'Failed to dispatch team');
      }
    } catch (err) {
      alert('An error occurred during dispatch');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleStatusUpdate = async (dispatchId: string, newStatus: string, note?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetchFromApi(API_ENDPOINTS.DISPATCH_STATUS(dispatchId), {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note }),
      });

      if (res.success) {
        setStatusModal({ isOpen: false, dispatchId: '', nextStatus: '', actionLabel: '', note: '' });
        fetchDispatches();
        if (selectedDispatch && selectedDispatch._id === dispatchId) {
          setSelectedDispatch({
            ...selectedDispatch,
            status: newStatus as any,
          });
        }
      } else {
        alert(res.message || 'Failed to update dispatch status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating dispatch status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredDispatches = dispatches.filter((d) => {
    const inc = typeof d.incident === 'object' ? d.incident : null;
    const team = typeof d.team === 'object' ? d.team : null;
    const query = searchQuery.toLowerCase();

    return (
      (inc?.title && inc.title.toLowerCase().includes(query)) ||
      (team?.name && team.name.toLowerCase().includes(query)) ||
      d._id.toLowerCase().includes(query) ||
      (d.district && d.district.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader title="Dispatch Command Center" subtitle="Tactical response deployment & live unit tracking" />

      <main className="flex-1 p-6 animate-fade-in max-w-7xl mx-auto w-full space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap bg-slate-200/80 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ACTIVE DISPATCHES
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WAITING / PENDING
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'in_progress' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              IN PROGRESS
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              COMPLETED
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search incident, team, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs shrink-0 active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Create Dispatch</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Loading tactical dispatches..." />
        ) : error ? (
          <ErrorState title="Error Loading Dispatches" message={error} onRetry={fetchDispatches} />
        ) : filteredDispatches.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={
              activeTab === 'active'
                ? 'No Active Dispatches'
                : activeTab === 'pending'
                ? 'No Pending Dispatches'
                : activeTab === 'in_progress'
                ? 'No Dispatches Currently In Progress'
                : 'No Completed Dispatches'
            }
            message="No dispatch records found matching your current filter. You can deploy tactical squads to verified incidents."
            action={{
              label: 'Create New Dispatch',
              onClick: openCreateModal,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredDispatches.map((dispatch) => {
              const incident = typeof dispatch.incident === 'object' ? dispatch.incident : null;
              const team = typeof dispatch.team === 'object' ? dispatch.team : null;
              const incidentId = incident?._id || (typeof dispatch.incident === 'string' ? dispatch.incident : '');
              const nextActions = ALLOWED_NEXT_STATUS[dispatch.status] || [];

              return (
                <div
                  key={dispatch._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Top Bar */}
                  <div className="p-5 border-b border-slate-100 flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            DISPATCH #{dispatch._id.slice(-6)}
                          </span>
                          <DispatchStatusBadge status={dispatch.status} />
                          {incident?.isSOS && <SOSIndicator />}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {incident?.title || `Incident #${incidentId.slice(-6)}`}
                        </h3>
                      </div>

                      {incident && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <SeverityBadge severity={incident.severity} />
                        </div>
                      )}
                    </div>

                    {/* Team & Unit Assignment Box */}
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 font-bold">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            {team?.name || 'Assigned Tactical Unit'}
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-md capitalize">
                              {team?.type || 'Field'} Squad
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <Users className="w-3 h-3" /> {team?.members?.length || 0} Members
                            <span>•</span>
                            <MapPin className="w-3 h-3" /> {dispatch.district}, {dispatch.state}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Dispatched
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-700">
                          {dispatch.dispatchedAt ? format(new Date(dispatch.dispatchedAt), 'p') : 'Live'}
                        </span>
                      </div>
                    </div>

                    {/* Location & Instructions */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{incident?.address || `${dispatch.district}, ${dispatch.state}`}</span>
                      </div>
                      {dispatch.notes && (
                        <div className="flex items-start gap-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-100 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <span className="line-clamp-2 italic font-medium">{dispatch.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Footer */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {incidentId && (
                        <Link
                          href={`/authority/incidents/${incidentId}`}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Incident</span>
                        </Link>
                      )}
                      <Link
                        href="/authority/teams"
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 hover:underline"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View Team</span>
                      </Link>
                    </div>

                    {/* Next Allowed State Transitions */}
                    <div className="flex items-center gap-2">
                      {nextActions.map((act) => {
                        const Icon = act.icon;
                        return (
                          <button
                            key={act.status}
                            onClick={() =>
                              setStatusModal({
                                isOpen: true,
                                dispatchId: dispatch._id,
                                nextStatus: act.status,
                                actionLabel: act.label,
                                note: '',
                              })
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 ${act.color}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Status Update Confirmation Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Radio className="w-4 h-4 text-blue-600" />
                {statusModal.actionLabel}
              </h3>
              <button
                onClick={() => setStatusModal({ isOpen: false, dispatchId: '', nextStatus: '', actionLabel: '', note: '' })}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Updating dispatch status to <span className="font-bold uppercase text-slate-900">{statusModal.nextStatus}</span>. Add an operational log note:
              </p>
              <div>
                <textarea
                  rows={3}
                  value={statusModal.note}
                  onChange={(e) => setStatusModal({ ...statusModal, note: e.target.value })}
                  placeholder="Operational update details or field notes (optional)..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModal({ isOpen: false, dispatchId: '', nextStatus: '', actionLabel: '', note: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusUpdate(statusModal.dispatchId, statusModal.nextStatus, statusModal.note)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Dispatch Panel (Slide-over) */}
      {showCreatePanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" /> New Tactical Dispatch
              </h2>
              <button
                onClick={() => {
                  setShowCreatePanel(false);
                  router.push('/authority/dispatches');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {loadingIncident || loadingAvailableIncidents ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-medium">Loading incident and tactical squad data...</p>
                </div>
              ) : targetIncident ? (
                <div className="space-y-6">
                  {/* Selected Incident Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Incident</span>
                      <button
                        onClick={() => {
                          setTargetIncident(null);
                          setSelectedTeamId('');
                          openCreateModal();
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{targetIncident.title}</p>
                    <div className="flex gap-2">
                      <SeverityBadge severity={targetIncident.severity} />
                      <PriorityBadge score={targetIncident.priorityScore} />
                      {targetIncident.isSOS && <SOSIndicator />}
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{targetIncident.address}, {targetIncident.district}, {targetIncident.state}</span>
                    </div>
                  </div>

                  {/* Team Selection */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Available Response Squads in {targetIncident.district}
                    </h3>

                    {availableTeams.length === 0 ? (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 font-medium">
                        No active available response teams currently located in {targetIncident.district}. You can update team readiness in Response Teams.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {availableTeams.map((team) => (
                          <div
                            key={team._id}
                            onClick={() => setSelectedTeamId(team._id)}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedTeamId === team._id
                                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-bold text-sm text-slate-900">{team.name}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md capitalize">
                                {team.type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {team.members?.length || 0} Members
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {team.district}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dispatch Notes */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Dispatch Instructions / Hazard Notes
                    </h3>
                    <textarea
                      rows={3}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="Add specific instructions, tactical access routes, or equipment needed..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                /* Select Incident Step */
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Select a Verified Incident to Dispatch</h3>
                    <p className="text-xs text-slate-500">Only verified incidents can be assigned to response squads.</p>
                  </div>

                  {availableIncidents.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                      <p className="text-xs text-slate-600">No verified incidents currently waiting for response teams.</p>
                      <Link
                        href="/authority/incidents"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                      >
                        Verify Incidents First
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {availableIncidents.map((inc) => (
                        <div
                          key={inc._id}
                          onClick={() => handleSelectIncident(inc)}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-all space-y-2"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{inc.title}</h4>
                            <SeverityBadge severity={inc.severity} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span>{inc.district}, {inc.state}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleCreateDispatch}
                disabled={!targetIncident || !selectedTeamId || isDispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-98"
              >
                <Zap className="w-4 h-4" />
                {isDispatching ? 'TRANSMITTING DISPATCH...' : 'CONFIRM & DEPLOY UNIT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading dispatch operations..." />}>
      <DispatchContent />
    </Suspense>
  );
}
