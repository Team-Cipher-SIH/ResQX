'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Radio,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Send,
  LogOut,
  UserCircle,
  Activity,
  Layers,
  ChevronRight,
  Truck,
  Play,
  CheckCircle,
  Navigation,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { DispatchStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import PulsingDot from '@/components/ui/PulsingDot';
import type { Dispatch } from '@/types/authority';

export default function ResponderDashboardPage() {
  const router = useRouter();
  const [responderName, setResponderName] = useState('Officer');
  const [responderSector, setResponderSector] = useState('Central');
  const [dutyStatus, setDutyStatus] = useState<'available' | 'on_site' | 'en_route'>('available');
  const [assignedDispatches, setAssignedDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.name) setResponderName(user.name);
      if (user.district && user.state) {
        setResponderSector(`${user.district}, ${user.state}`);
      } else if (user.state) {
        setResponderSector(user.state);
      }
    }
  }, []);

  const loadResponderDispatches = async () => {
    setLoading(true);
    try {
      // First try /api/dispatches/active, or fallback to /api/dispatches
      const res = await fetchFromApi<Dispatch[]>(API_ENDPOINTS.ACTIVE_DISPATCHES);
      if (res.success && Array.isArray(res.data)) {
        setAssignedDispatches(res.data);
      } else {
        const allRes = await fetchFromApi<Dispatch[]>(API_ENDPOINTS.DISPATCHES);
        if (allRes.success && Array.isArray(allRes.data)) {
          const active = allRes.data.filter((d) =>
            ['pending', 'accepted', 'en_route', 'on_site', 'in_progress'].includes(d.status)
          );
          setAssignedDispatches(active);
        }
      }
    } catch (e) {
      console.warn('Failed to load responder dispatches', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponderDispatches();
  }, []);

  // Real-time notifications
  useSocket({
    'dispatch-assigned': () => loadResponderDispatches(),
    'dispatch-updated': () => loadResponderDispatches(),
  });

  const handleUpdateDispatchStatus = async (dispatchId: string, nextStatus: string, note?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetchFromApi(API_ENDPOINTS.DISPATCH_STATUS(dispatchId), {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          note: note || `Field responder updated status to ${nextStatus}`,
        }),
      });

      if (res.success) {
        loadResponderDispatches();
      } else {
        alert(res.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Field Responder Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base font-mono tracking-tight text-white">
                ResQ<span className="text-orange-500">tech</span>
              </span>
              <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-orange-500/30">
                Field Responder
              </span>
            </div>
            <p className="text-xs text-slate-400">Mobile Tactical Dispatch Unit</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-300 font-medium">{responderSector}</span>
          </div>

          <button
            onClick={() => logout('authority')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 hover:border-red-800 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Responder Greeting & Telemetry */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <PulsingDot variant="live" size="sm" />
              <span>Live Tactical Feed Active</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {responderName}</h1>
            <p className="text-xs text-slate-400 max-w-lg">
              Stationed in {responderSector}. Active assignments from command control are synchronized live.
            </p>
          </div>

          {/* Status Switcher */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Readiness Status</span>
            <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDutyStatus('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'available'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('en_route')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'en_route'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                En Route
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('on_site')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dutyStatus === 'on_site'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                On Site
              </button>
            </div>
          </div>
        </div>

        {/* Live Active Mission / Dispatches Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                Active Tactical Missions & Dispatches
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-800">
                {assignedDispatches.length} Active
              </span>
            </div>

            <button
              onClick={loadResponderDispatches}
              disabled={loading}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          {loading && assignedDispatches.length === 0 ? (
            <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              Synchronizing tactical dispatches...
            </div>
          ) : assignedDispatches.length === 0 ? (
            <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-white text-base">Standby Ready — No Active Dispatches</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active emergency dispatch assigned to your squad in this sector. GPS tracking and telemetry are active on the central grid.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assignedDispatches.map((dispatch) => {
                const incident = typeof dispatch.incident === 'object' ? dispatch.incident : null;
                const team = typeof dispatch.team === 'object' ? dispatch.team : null;

                return (
                  <div
                    key={dispatch._id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-orange-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            #{dispatch._id.slice(-6)}
                          </span>
                          <DispatchStatusBadge status={dispatch.status} />
                          {incident?.isSOS && <SOSIndicator />}
                        </div>
                        <h3 className="text-base font-bold text-white line-clamp-1">
                          {incident?.title || 'Tactical Incident Mission'}
                        </h3>
                      </div>

                      {incident && <SeverityBadge severity={incident.severity} />}
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                        <span>{incident?.address || `${dispatch.district}, ${dispatch.state}`}</span>
                      </div>
                      {team && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                          <span>Squad: <b className="text-slate-200">{team.name}</b> ({team.type})</span>
                        </div>
                      )}
                      {dispatch.notes && (
                        <div className="text-amber-300/90 italic pt-1 border-t border-slate-800">
                          &quot;{dispatch.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Quick Advance Action Buttons */}
                    <div className="pt-1 flex flex-wrap gap-2">
                      {dispatch.status === 'pending' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateDispatchStatus(dispatch._id, 'accepted')}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98"
                        >
                          Acknowledge & Accept
                        </button>
                      )}

                      {dispatch.status === 'accepted' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateDispatchStatus(dispatch._id, 'en_route')}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Depart (En Route)</span>
                        </button>
                      )}

                      {dispatch.status === 'en_route' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateDispatchStatus(dispatch._id, 'on_site')}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Arrived On Site</span>
                        </button>
                      )}

                      {dispatch.status === 'on_site' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateDispatchStatus(dispatch._id, 'in_progress')}
                          className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Begin Incident Response</span>
                        </button>
                      )}

                      {dispatch.status === 'in_progress' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateDispatchStatus(dispatch._id, 'completed')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Complete Mission</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Operational Guidelines & Quick Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tactical Protocols</span>
              <span className="text-orange-400 text-xs font-mono">P1 Incident Operations</span>
            </div>
            <h3 className="font-bold text-sm text-white">Standard Field Operation Rules</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Confirm arrival on site immediately upon reaching coordinates.</li>
              <li>Coordinate with local medical and relief camps for evacuation triage.</li>
              <li>Update status to Completed once area search and rescue is finalized.</li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Grid Hotline</span>
              <Phone className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Central Operations Comms</h3>
            <p className="text-xs text-slate-400">
              For air lift support, hazmat decontamination, or rapid reinforcement:
            </p>
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">Tactical VoIP:</span>
              <span className="text-orange-400 font-mono font-bold">+91 112 / +91 1070 (Disaster Ops)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
