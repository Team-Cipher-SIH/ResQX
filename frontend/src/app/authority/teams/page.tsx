'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { TeamStatusBadge, IncidentStatusBadge, SeverityBadge } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { ResponseTeam, Dispatch } from '@/types/authority';
import { INDIA_STATES, getDistrictsForState } from '@/data/indiaStatesDistricts';
import {
  Plus,
  Users,
  MapPin,
  Shield,
  Wrench,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCircle,
  Phone,
  ChevronDown,
  X,
  Truck,
  Zap,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [activeDispatches, setActiveDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ResponseTeam | null>(null);

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'general',
    state: '',
    district: '',
    capabilities: '',
  });
  const [formDistricts, setFormDistricts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeamsAndDispatches = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterType !== 'all') queryParams.append('type', filterType);
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);

      const [teamsRes, dispatchesRes] = await Promise.all([
        fetchFromApi<ResponseTeam[]>(`${API_ENDPOINTS.TEAMS}?${queryParams.toString()}`),
        fetchFromApi<Dispatch[]>(`${API_ENDPOINTS.DISPATCHES}?status=pending,accepted,en_route,on_site,in_progress`),
      ]);

      if (teamsRes.success && teamsRes.data) {
        setTeams(teamsRes.data);
      } else {
        setError(teamsRes.message || 'Failed to fetch teams');
      }

      if (dispatchesRes.success && dispatchesRes.data && Array.isArray(dispatchesRes.data)) {
        setActiveDispatches(dispatchesRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching response squads');
    } finally {
      setLoading(false);
    }
  };

  // Realtime updates
  useSocket({
    'team-updated': () => fetchTeamsAndDispatches(),
    'dispatch-created': () => fetchTeamsAndDispatches(),
    'dispatch-updated': () => fetchTeamsAndDispatches(),
  });

  useEffect(() => {
    fetchTeamsAndDispatches();
  }, [filterType, filterStatus]);

  // Map active dispatches by team ID for fast lookup
  const teamDispatchMap = useMemo(() => {
    const map = new Map<string, Dispatch>();
    activeDispatches.forEach((d) => {
      const teamId = typeof d.team === 'object' ? d.team?._id : d.team;
      if (teamId) {
        map.set(teamId, d);
      }
    });
    return map;
  }, [activeDispatches]);

  // Operational metrics
  const metrics = useMemo(() => {
    const available = teams.filter((t) => t.status === 'available').length;
    const busy = teams.filter((t) => t.status === 'busy').length;
    const offline = teams.filter((t) => t.status === 'offline').length;
    return { available, busy, offline, total: teams.length };
  }, [teams]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setFormData({ ...formData, state: newState, district: '' });
    setFormDistricts(getDistrictsForState(newState));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        state: formData.state,
        district: formData.district,
        capabilities: formData.capabilities.split(',').map((c) => c.trim()).filter(Boolean),
      };
      
      const res = await fetchFromApi(API_ENDPOINTS.TEAMS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormData({ name: '', type: 'general', state: '', district: '', capabilities: '' });
        fetchTeamsAndDispatches();
      } else {
        alert(res.message || 'Failed to create team');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvailabilityToggle = async (teamId: string, newStatus: string) => {
    try {
      const res = await fetchFromApi(API_ENDPOINTS.TEAM_AVAILABILITY(teamId), {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        fetchTeamsAndDispatches();
        if (selectedTeam && selectedTeam._id === teamId) {
          setSelectedTeam({ ...selectedTeam, status: newStatus as any });
        }
      }
    } catch (err) {
      console.error('Failed to update availability');
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (team.district && team.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
    team.capabilities?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader title="Response Teams & Field Squads" subtitle="Operational squad readiness, active assignments & status tracking" />

      <main className="flex-1 p-6 animate-fade-in max-w-7xl mx-auto w-full space-y-6">
        {/* Operational Overview KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Squads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{metrics.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('available')}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all shadow-xs flex items-center justify-between ${
              filterStatus === 'available' ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available (Ready)</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{metrics.available}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('busy')}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all shadow-xs flex items-center justify-between ${
              filterStatus === 'busy' ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-orange-300'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Deployed (Busy)</p>
              <h3 className="text-2xl font-black text-orange-700 mt-0.5">{metrics.busy}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('offline')}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all shadow-xs flex items-center justify-between ${
              filterStatus === 'offline' ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Offline / Standby</p>
              <h3 className="text-2xl font-black text-slate-700 mt-0.5">{metrics.offline}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search squad name, district, skills..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
            
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="all">All Types</option>
              <option value="medical">Medical</option>
              <option value="fire">Fire</option>
              <option value="rescue">Rescue</option>
              <option value="flood">Flood</option>
              <option value="police">Police</option>
              <option value="hazmat">Hazmat</option>
              <option value="general">General</option>
            </select>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="all">All Status</option>
              <option value="available">Available (Ready)</option>
              <option value="busy">Busy (On Mission)</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs whitespace-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Response Team</span>
          </button>
        </div>

        {/* Squad Cards Grid */}
        {loading ? (
          <LoadingState message="Loading response squads & live telemetry..." />
        ) : error ? (
          <ErrorState title="Error Loading Teams" message={error} onRetry={fetchTeamsAndDispatches} />
        ) : filteredTeams.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No Response Squads Found" 
            message="No response squads match your current filters. You can create a new team or reset filters." 
            action={{ label: 'Clear Filters', onClick: () => { setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); } }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeams.map((team) => {
              const activeDispatch = teamDispatchMap.get(team._id);
              const assignedIncident = activeDispatch && typeof activeDispatch.incident === 'object' ? activeDispatch.incident : null;
              const incidentId = assignedIncident?._id || (typeof activeDispatch?.incident === 'string' ? activeDispatch.incident : null);

              return (
                <div
                  key={team._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="p-5 border-b border-slate-100 flex-1 space-y-3.5">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{team.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md capitalize">
                            {team.type}
                          </span>
                          <TeamStatusBadge status={team.status} />
                        </div>
                      </div>

                      {/* Quick Status Toggle Dropdown */}
                      <select
                        value={team.status}
                        onChange={(e) => handleAvailabilityToggle(team._id, e.target.value)}
                        className="text-[11px] font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="available">Set Available</option>
                        <option value="busy">Set Busy</option>
                        <option value="offline">Set Offline</option>
                      </select>
                    </div>

                    {/* Location & Squad Lead */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{team.district}, {team.state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {team.members?.length || 0} Members {team.leader ? `• Lead: ${team.leader.name}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Operational Assignment Indicator */}
                    {activeDispatch ? (
                      <div className="bg-orange-50/80 rounded-xl p-3 border border-orange-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Deployed Assignment
                          </span>
                          <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded capitalize">
                            {activeDispatch.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">
                          {assignedIncident?.title || `Incident #${incidentId?.slice(-6)}`}
                        </p>
                        {incidentId && (
                          <div className="flex items-center gap-3 pt-1 text-[11px]">
                            <Link
                              href={`/authority/incidents/${incidentId}`}
                              className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 hover:underline"
                            >
                              <span>View Incident</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                            <Link
                              href="/authority/dispatches"
                              className="font-bold text-slate-600 hover:text-slate-800 flex items-center gap-0.5 hover:underline"
                            >
                              <span>View Dispatch</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Squad standby • Ready for next emergency dispatch</span>
                      </div>
                    )}

                    {/* Capabilities Tags */}
                    {team.capabilities && team.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {team.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                            {cap}
                          </span>
                        ))}
                        {team.capabilities.length > 3 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-md">
                            +{team.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedTeam(team)}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Squad Details
                    </button>
                    {team.status === 'available' && (
                      <Link
                        href="/authority/dispatches"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
                      >
                        <span>Dispatch Squad</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Register Response Squad
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Squad Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. NDRF Unit 04 / District Rapid Medical"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Specialization Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="medical">Medical</option>
                  <option value="fire">Fire</option>
                  <option value="rescue">Rescue</option>
                  <option value="flood">Flood</option>
                  <option value="police">Police</option>
                  <option value="hazmat">Hazmat</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">State</label>
                  <select 
                    required
                    value={formData.state}
                    onChange={handleStateChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">District</label>
                  <select 
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    disabled={!formData.state}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">Select District</option>
                    {formDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Capabilities (comma separated)</label>
                <input 
                  type="text" 
                  value={formData.capabilities}
                  onChange={(e) => setFormData({...formData, capabilities: e.target.value})}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Inflatable Boats, Heavy Rescue, Paramedic, Drone Surveillance"
                />
              </div>
              
              <div className="pt-3 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Registering Squad...' : 'Register Response Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Details Panel / Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">Squad Profile & Telemetry</h2>
              <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedTeam.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md capitalize">
                    {selectedTeam.type}
                  </span>
                  <TeamStatusBadge status={selectedTeam.status} />
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 font-semibold">{selectedTeam.district}, {selectedTeam.state}</span>
                  </div>
                  {selectedTeam.leader && (
                    <div className="flex items-center gap-2 text-xs">
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">Team Leader: <span className="font-bold text-slate-900">{selectedTeam.leader.name}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Switcher */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Readiness State</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'available')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedTeam.status === 'available' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Available
                  </button>
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'busy')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedTeam.status === 'busy' ? 'bg-orange-600 border-orange-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Busy
                  </button>
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'offline')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedTeam.status === 'offline' ? 'bg-slate-700 border-slate-700 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Offline
                  </button>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Tactical Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTeam.capabilities?.map((cap, i) => (
                    <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                      {cap}
                    </span>
                  ))}
                  {(!selectedTeam.capabilities || selectedTeam.capabilities.length === 0) && (
                    <span className="text-xs text-slate-500 italic">No specific tactical skills configured.</span>
                  )}
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" /> Squad Personnel ({selectedTeam.members?.length || 0})
                </h4>
                {selectedTeam.members && selectedTeam.members.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <li key={member._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{member.name}</p>
                            <p className="text-[11px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-xs text-slate-500">
                    No field personnel currently assigned to this unit.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
