'use client';

import { useState, useEffect } from 'react';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { TeamStatusBadge } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { ResponseTeam } from '@/types/authority';
import { INDIA_STATES, getDistrictsForState } from '@/data/indiaStatesDistricts';
import { Plus, Users, MapPin, Shield, Wrench, Search, Filter, Eye, Edit, Trash2, UserCircle, Phone, ChevronDown, X } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
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

  useEffect(() => {
    fetchTeams();
  }, [filterType, filterStatus]); // Re-fetch on filter change if API supports it, or handle client-side

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterType !== 'all') queryParams.append('type', filterType);
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);

      const res = await fetchFromApi<ResponseTeam[]>(`${API_ENDPOINTS.TEAMS}?${queryParams.toString()}`);
      if (res.success && res.data) {
        setTeams(res.data);
      } else {
        setError(res.message || 'Failed to fetch teams');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        capabilities: formData.capabilities.split(',').map(c => c.trim()).filter(Boolean),
      };
      
      const res = await fetchFromApi(API_ENDPOINTS.TEAMS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormData({ name: '', type: 'general', state: '', district: '', capabilities: '' });
        fetchTeams();
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
        fetchTeams();
        if (selectedTeam && selectedTeam._id === teamId) {
          setSelectedTeam({ ...selectedTeam, status: newStatus as any });
        }
      }
    } catch (err) {
      console.error('Failed to update availability');
    }
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <AuthorityHeader title="Response Teams" subtitle="Manage and monitor field responder teams" />

      <div className="p-6 flex-1 overflow-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search teams..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading response teams..." />
        ) : error ? (
          <ErrorState title="Error Loading Teams" message={error} onRetry={fetchTeams} />
        ) : filteredTeams.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No Teams Found" 
            message="There are no response teams matching your current filters." 
            action={{ label: 'Clear Filters', onClick: () => { setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); } }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div key={team._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                <div className="p-5 border-b border-slate-100 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{team.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md capitalize">
                          {team.type}
                        </span>
                        <TeamStatusBadge status={team.status} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span>{team.district}, {team.state}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span>{team.members?.length || 0} Members {team.leader ? `(Leader: ${team.leader.name})` : ''}</span>
                    </div>
                  </div>

                  {team.capabilities && team.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {team.capabilities.slice(0, 3).map((cap, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                          {cap}
                        </span>
                      ))}
                      {team.capabilities.length > 3 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full">
                          +{team.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedTeam(team)}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 active:scale-95 transition-transform"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors active:scale-95">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Create New Team</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Alpha Rescue Unit"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Team Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <select 
                      required
                      value={formData.state}
                      onChange={handleStateChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select State</option>
                      {INDIA_STATES.map((s) => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                    <select 
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({...formData, district: e.target.value})}
                      disabled={!formData.state}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">Select District</option>
                      {formDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capabilities (comma separated)</label>
                  <input 
                    type="text" 
                    value={formData.capabilities}
                    onChange={(e) => setFormData({...formData, capabilities: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. First Aid, Search & Rescue, Boats"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Details Panel / Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Team Details</h2>
              <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedTeam.name}</h3>
                <div className="flex gap-2 mb-4">
                  <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md capitalize">
                    {selectedTeam.type}
                  </span>
                  <TeamStatusBadge status={selectedTeam.status} />
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 font-medium">{selectedTeam.district}, {selectedTeam.state}</span>
                  </div>
                  {selectedTeam.leader && (
                    <div className="flex items-center gap-3 text-sm">
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">Leader: <span className="font-medium">{selectedTeam.leader.name}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Availability Status</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'available')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTeam.status === 'available' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Available
                  </button>
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'busy')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTeam.status === 'busy' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Busy
                  </button>
                  <button 
                    onClick={() => handleAvailabilityToggle(selectedTeam._id, 'offline')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTeam.status === 'offline' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Offline
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTeam.capabilities?.map((cap, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                      {cap}
                    </span>
                  ))}
                  {(!selectedTeam.capabilities || selectedTeam.capabilities.length === 0) && (
                    <span className="text-sm text-slate-500 italic">No specific capabilities listed.</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Members ({selectedTeam.members?.length || 0})
                </h4>
                {selectedTeam.members && selectedTeam.members.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <li key={member._id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-center text-sm text-slate-500">
                    No members have joined this team yet.
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
