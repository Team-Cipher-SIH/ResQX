'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, DispatchStatusBadge, TeamStatusBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { Dispatch, Incident, ResponseTeam } from '@/types/authority';
import { Send, AlertTriangle, Users, MapPin, Clock, CheckCircle2, Truck, ArrowRight, Plus, Eye, Filter, Search, X, Zap } from 'lucide-react';

function DispatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incidentIdParam = searchParams.get('incident');

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Dispatch State
  const [showCreatePanel, setShowCreatePanel] = useState(!!incidentIdParam);
  const [targetIncident, setTargetIncident] = useState<Incident | null>(null);
  const [availableTeams, setAvailableTeams] = useState<ResponseTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [loadingIncident, setLoadingIncident] = useState(!!incidentIdParam);

  useEffect(() => {
    fetchDispatches();
    
    if (incidentIdParam) {
      loadIncidentForDispatch(incidentIdParam);
    }
  }, [incidentIdParam, activeTab]);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      // Typically you'd pass a status filter or use /active endpoint
      const endpoint = activeTab === 'active' 
        ? `${API_ENDPOINTS.DISPATCHES}?status=pending,accepted,en_route,on_site,in_progress` 
        : `${API_ENDPOINTS.DISPATCHES}?status=completed,cancelled`;
        
      const res = await fetchFromApi<Dispatch[]>(endpoint);
      if (res.success && res.data) {
        setDispatches(res.data);
      } else {
        setError(res.message || 'Failed to fetch dispatches');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentForDispatch = async (id: string) => {
    setShowCreatePanel(true);
    setLoadingIncident(true);
    try {
      const res = await fetchFromApi<Incident>(API_ENDPOINTS.INCIDENT_DETAIL(id));
      if (res.success && res.data) {
        setTargetIncident(res.data);
        
        // Fetch teams in same district
        const teamsRes = await fetchFromApi<ResponseTeam[]>(
          `${API_ENDPOINTS.TEAMS}?status=available&district=${encodeURIComponent(res.data.district)}`
        );
        if (teamsRes.success && teamsRes.data) {
          setAvailableTeams(teamsRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load incident for dispatch', err);
    } finally {
      setLoadingIncident(false);
    }
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
          notes: dispatchNotes
        })
      });

      if (res.success) {
        setShowCreatePanel(false);
        setTargetIncident(null);
        setSelectedTeamId('');
        setDispatchNotes('');
        router.push('/authority/dispatches'); // Clear query param
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

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <AuthorityHeader title="Dispatch Management" subtitle="Coordinate and track response teams" />

      <div className="p-6 flex-1 overflow-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Active Dispatches
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Dispatch History
            </button>
          </div>

          <button 
            onClick={() => setShowCreatePanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            New Dispatch
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading dispatches..." />
        ) : error ? (
          <ErrorState title="Error Loading Dispatches" message={error} onRetry={fetchDispatches} />
        ) : dispatches.length === 0 ? (
          <EmptyState 
            icon={Truck}
            title={activeTab === 'active' ? "No Active Dispatches" : "No Dispatch History"} 
            message={activeTab === 'active' ? "There are no response teams currently deployed." : "No completed or cancelled dispatches found."}
          />
        ) : (
          <div className={activeTab === 'active' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "bg-white border border-slate-200 rounded-xl overflow-hidden"}>
            {activeTab === 'active' ? (
              dispatches.map(dispatch => {
                const incident = typeof dispatch.incident === 'object' ? dispatch.incident : null;
                const team = typeof dispatch.team === 'object' ? dispatch.team : null;
                
                return (
                  <div key={dispatch._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                    <div className="p-5 border-b border-slate-100 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{incident?.title || 'Unknown Incident'}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {incident?.isSOS && <SOSIndicator />}
                            {incident && <SeverityBadge severity={incident.severity} />}
                            <DispatchStatusBadge status={dispatch.status} />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{team?.name || 'Unknown Team'}</p>
                            <p className="text-xs text-slate-500 capitalize">{team?.type || 'General'} Response</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-slate-500 block mb-1">Time Elapsed</span>
                          <span className="text-sm font-mono text-slate-900">
                            {/* In a real app, calculate elapsed time from dispatchedAt */}
                            Live
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{incident?.address || `${dispatch.district}, ${dispatch.state}`}</span>
                        </div>
                        {dispatch.notes && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <span className="line-clamp-2 italic">{dispatch.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <button className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 active:scale-95 transition-transform">
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                      <button className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 active:scale-95 transition-all shadow-xs">
                        Update Status
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-700">Incident</th>
                    <th className="px-6 py-3 font-semibold text-slate-700">Team</th>
                    <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-3 font-semibold text-slate-700">Dispatched At</th>
                    <th className="px-6 py-3 font-semibold text-slate-700">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dispatches.map(dispatch => {
                    const incident = typeof dispatch.incident === 'object' ? dispatch.incident : null;
                    const team = typeof dispatch.team === 'object' ? dispatch.team : null;
                    return (
                      <tr key={dispatch._id} className="hover:bg-slate-50/90 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 truncate max-w-[200px]">{incident?.title || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{dispatch.district}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{team?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <DispatchStatusBadge status={dispatch.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500">{new Date(dispatch.dispatchedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-500">{dispatch.completedAt ? new Date(dispatch.completedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Create Dispatch Panel (Slide-over) */}
      {showCreatePanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" /> New Dispatch
              </h2>
              <button onClick={() => { setShowCreatePanel(false); router.push('/authority/dispatches'); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {loadingIncident ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Loading incident details...</p>
                </div>
              ) : targetIncident ? (
                <div className="space-y-6">
                  {/* Incident Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Incident</h3>
                    <p className="font-bold text-slate-900 mb-2">{targetIncident.title}</p>
                    <div className="flex gap-2 mb-3">
                      <SeverityBadge severity={targetIncident.severity} />
                      <PriorityBadge score={targetIncident.priorityScore} />
                      {targetIncident.isSOS && <SOSIndicator />}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span>{targetIncident.address}, {targetIncident.district}</span>
                    </div>
                  </div>

                  {/* Team Selection */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Teams in {targetIncident.district}</h3>
                    
                    {availableTeams.length === 0 ? (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                        No available teams found in this district. You may need to request teams from neighboring districts.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableTeams.map(team => (
                          <div 
                            key={team._id}
                            onClick={() => setSelectedTeamId(team._id)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedTeamId === team._id 
                                ? 'border-blue-600 bg-blue-50' 
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-bold text-slate-900">{team.name}</p>
                              <span className="text-xs font-medium px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-md capitalize">
                                {team.type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {team.members?.length || 0}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {team.district}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dispatch Notes / Instructions</h3>
                    <textarea 
                      rows={3}
                      value={dispatchNotes}
                      onChange={e => setDispatchNotes(e.target.value)}
                      placeholder="Add any specific instructions, hazards to watch out for, or equipment needed..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">Please select an incident to dispatch a team.</p>
                  <button 
                    onClick={() => { setShowCreatePanel(false); router.push('/authority/incidents'); }}
                    className="text-blue-600 font-medium hover:underline text-sm"
                  >
                    Go to Incidents
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={handleCreateDispatch}
                disabled={!targetIncident || !selectedTeamId || isDispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Zap className="w-5 h-5" />
                {isDispatching ? 'SENDING...' : 'SEND RESPONSE SIGNAL'}
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
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <DispatchContent />
    </Suspense>
  );
}
