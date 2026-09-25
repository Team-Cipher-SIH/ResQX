'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, Shield, Clock, CheckCircle2, Users, Send, 
  Activity, Siren, Eye, ArrowRight, TrendingUp, MapPin, Radio, Zap, Home,
  Package, Droplets, Utensils, HeartPulse, Bed 
} from 'lucide-react';

import AuthorityHeader from '@/components/authority/AuthorityHeader';
import StatCard from '@/components/authority/StatCard';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState, SkeletonCard, SkeletonTable } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { DashboardStats, Incident, ActivityLogEntry, IncidentType, Shelter, Supply } from '@/types/authority';
import { getShelterStatus, getSupplyStatusColor, getSupplyStatusLabel } from '@/types/authority';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import { MOCK_SUPPLIES_DATA } from '@/data/supplyMockData';
import PulsingDot from '@/components/ui/PulsingDot';
import CommandMap from '@/components/authority/CommandMap';
import PreparednessCard from '@/components/authority/PreparednessCard';

function formatRelativeTime(dateString?: string) {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'recently';
  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

const getDisasterIcon = (type: IncidentType) => {
  switch (type) {
    case 'fire': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'flood': return <Activity className="w-4 h-4 text-blue-500" />;
    case 'earthquake': return <Activity className="w-4 h-4 text-amber-600" />;
    case 'cyclone': return <Siren className="w-4 h-4 text-teal-500" />;
    default: return <AlertTriangle className="w-4 h-4 text-slate-500" />;
  }
};

const getActivityIcon = (action: string) => {
  if (action.includes('sos')) return <Radio className="w-3.5 h-3.5 text-red-500" />;
  if (action.includes('resolved') || action.includes('completed')) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (action.includes('dispatch') || action.includes('assigned')) return <Send className="w-3.5 h-3.5 text-blue-500" />;
  if (action.includes('verified')) return <Shield className="w-3.5 h-3.5 text-indigo-500" />;
  if (action.includes('team')) return <Users className="w-3.5 h-3.5 text-purple-500" />;
  return <Zap className="w-3.5 h-3.5 text-amber-500" />;
};

export default function AuthorityDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  
  const [supplies, setSupplies] = useState<Supply[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, incidentsRes, activityRes, sheltersRes, suppliesRes] = await Promise.all([
        fetchFromApi<DashboardStats>(API_ENDPOINTS.DASHBOARD_STATS),
        fetchFromApi<Incident[]>(API_ENDPOINTS.INCIDENTS + '?limit=10&sort=-createdAt'),
        fetchFromApi<ActivityLogEntry[]>(API_ENDPOINTS.DASHBOARD_ACTIVITY + '?limit=20'),
        fetchFromApi<Shelter[]>(API_ENDPOINTS.SHELTERS),
        fetchFromApi<Supply[]>(API_ENDPOINTS.SUPPLIES),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        throw new Error(statsRes.message || 'Failed to load dashboard statistics.');
      }

      if (incidentsRes.success && incidentsRes.data) {
        const incidentList = Array.isArray(incidentsRes.data) 
          ? incidentsRes.data 
          : (incidentsRes.data as any).incidents || [];
        setIncidents(incidentList.slice(0, 10));
      }

      if (activityRes.success && activityRes.data) {
        setActivities(Array.isArray(activityRes.data) ? activityRes.data : []);
      }

      if (sheltersRes.success && sheltersRes.data && Array.isArray(sheltersRes.data)) {
        setShelters(sheltersRes.data);
      } else {
        setShelters(MOCK_SHELTERS_DATA);
      }

      if (suppliesRes.success && suppliesRes.data && Array.isArray(suppliesRes.data)) {
        setSupplies(suppliesRes.data);
      } else {
        setSupplies(MOCK_SUPPLIES_DATA);
      }
    } catch (err: any) {
      setShelters(MOCK_SHELTERS_DATA);
      setSupplies(MOCK_SUPPLIES_DATA);
      setError(err.message || 'An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime updates
  useSocket({
    'new-incident': () => loadData(),
    'incident-updated': () => loadData(),
    'dispatch-created': () => loadData(),
    'dispatch-updated': () => loadData(),
    'new-alert': () => loadData(),
  });

  // Compute central shelter overview metrics
  const shelterMetrics = React.useMemo(() => {
    let total = shelters.length;
    let totalCap = 0;
    let totalOcc = 0;
    let criticalShortages = 0; // occupancy >= 85%

    shelters.forEach((s) => {
      const cap = s.capacity || 0;
      const occ = s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0;
      totalCap += cap;
      totalOcc += occ;

      const st = getShelterStatus(s);
      if (st === 'near_capacity' || st === 'full') {
        criticalShortages++;
      }
    });

    const totalAvail = Math.max(0, totalCap - totalOcc);

    return { total, totalCap, totalAvail, criticalShortages };
  }, [shelters]);

  // Compute central supply metrics & alerts
  const centralSupplyMetrics = React.useMemo(() => {
    let totalItems = supplies.length;
    let totalWater = 0;
    let totalFood = 0;
    let totalMedicine = 0;
    let criticalCount = 0;
    const affectedDistrictsSet = new Set<string>();

    let waterCritical = false;
    let waterLow = false;
    let foodCritical = false;
    let foodLow = false;
    let medCritical = false;
    let medLow = false;

    supplies.forEach((s) => {
      const cat = s.category.toLowerCase();
      if (cat === 'water') {
        totalWater += s.quantity;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') waterCritical = true;
        else if (s.status === 'LOW') waterLow = true;
      } else if (cat === 'food') {
        totalFood += s.quantity;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') foodCritical = true;
        else if (s.status === 'LOW') foodLow = true;
      } else if (cat === 'medicine' || cat === 'first aid') {
        totalMedicine += s.quantity;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') medCritical = true;
        else if (s.status === 'LOW') medLow = true;
      }

      if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') {
        criticalCount++;
        if (s.district) affectedDistrictsSet.add(s.district);
      }
    });

    const waterStatus = waterCritical ? 'Critical' : waterLow ? 'Low' : 'Available';
    const foodStatus = foodCritical ? 'Critical' : foodLow ? 'Low' : 'Available';
    const medStatus = medCritical ? 'Critical' : medLow ? 'Low' : 'Available';

    return {
      totalItems,
      totalWater,
      totalFood,
      totalMedicine,
      criticalCount,
      affectedDistrictsCount: affectedDistrictsSet.size,
      waterStatus,
      foodStatus,
      medStatus,
    };
  }, [supplies]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader title="Command Center" subtitle="Monitor and coordinate emergency operations nationwide" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {error ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6">
            <ErrorState message={error} onRetry={loadData} />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {loading || !stats ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  <StatCard
                    icon={AlertTriangle}
                    label="Active Incidents"
                    value={stats.activeIncidents}
                    color="blue"
                  />
                  <StatCard
                    icon={Siren}
                    label="Critical Incidents"
                    value={stats.criticalIncidents}
                    color="red"
                  />
                  <StatCard
                    icon={Clock}
                    label="Pending Verification"
                    value={stats.pendingVerification}
                    color="orange"
                  />
                  <StatCard
                    icon={Send}
                    label="Dispatched Units"
                    value={stats.dispatchedIncidents}
                    color="purple"
                  />
                  <StatCard
                    icon={Users}
                    label="Ready Response Teams"
                    value={stats.activeResponseTeams}
                    color="emerald"
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Resolved Today"
                    value={stats.resolvedToday}
                    color="emerald"
                  />
                </>
              )}
            </div>

            {/* Preparedness Status Overview */}
            <PreparednessCard />

            {/* Compact Supply Resource Overview Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all duration-200 hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">National Relief Supply & Stockpile Reserve</h3>
                    {centralSupplyMetrics.criticalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                        {centralSupplyMetrics.criticalCount} Alerts
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live logistics readiness &bull; {centralSupplyMetrics.criticalCount} critical shortages in {centralSupplyMetrics.affectedDistrictsCount} sectors
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Water Metric */}
                <div className="px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs flex items-center gap-2 shadow-2xs">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Water</span>
                    <span className="font-mono font-bold text-slate-900">{centralSupplyMetrics.totalWater.toLocaleString()} L</span>
                  </div>
                </div>

                {/* Food Metric */}
                <div className="px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs flex items-center gap-2 shadow-2xs">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Food Kits</span>
                    <span className="font-mono font-bold text-slate-900">{centralSupplyMetrics.totalFood.toLocaleString()}</span>
                  </div>
                </div>

                {/* Medicine Metric */}
                <div className="px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs flex items-center gap-2 shadow-2xs">
                  <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Medical</span>
                    <span className="font-mono font-bold text-slate-900">{centralSupplyMetrics.totalMedicine.toLocaleString()}</span>
                  </div>
                </div>

                {/* Stock Readiness Badges */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[10px] font-bold">
                  <span className={centralSupplyMetrics.waterStatus === 'Critical' ? 'text-red-600 font-extrabold' : 'text-emerald-700'}>
                    Water: {centralSupplyMetrics.waterStatus}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className={centralSupplyMetrics.foodStatus === 'Critical' ? 'text-red-600 font-extrabold' : 'text-emerald-700'}>
                    Food: {centralSupplyMetrics.foodStatus}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className={centralSupplyMetrics.medStatus === 'Critical' ? 'text-red-600 font-extrabold' : 'text-emerald-700'}>
                    Med: {centralSupplyMetrics.medStatus}
                  </span>
                </div>

                <Link
                  href="/authority/supplies"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-180 shadow-xs hover:shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <span>Supplies Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Compact Shelter Resource Overview Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">National Relief & Shelter Inventory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live capacity and intake saturation across nationwide safe havens</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center shadow-2xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Shelters</span>
                  <span className="text-sm font-black font-mono text-slate-900">{shelterMetrics.total}</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center shadow-2xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Capacity</span>
                  <span className="text-sm font-black font-mono text-slate-900">{shelterMetrics.totalCap.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-center shadow-2xs">
                  <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block">Available Vacancies</span>
                  <span className="text-sm font-black font-mono text-emerald-700">{shelterMetrics.totalAvail.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/80 text-center shadow-2xs">
                  <span className="text-[9px] text-amber-700 font-bold uppercase tracking-wider block">Capacity Alerts (&gt;85%)</span>
                  <span className="text-sm font-black font-mono text-amber-700">{shelterMetrics.criticalShortages}</span>
                </div>
                <Link
                  href="/authority/shelters"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-180 shadow-xs hover:shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <span>Shelters Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Tactical Geospatial Command Map */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all duration-200 hover:border-slate-300">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Operational Situation Map
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Live geospatial telemetry across active incidents, response squads, and verified relief camps</p>
                </div>
              </div>
              <CommandMap
                scope="central"
                incidents={incidents}
                shelters={shelters}
                height="440px"
              />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Priority Queue */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden transition-all duration-200 hover:border-slate-300">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Incident Priority Queue</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Most critical active incidents requiring immediate dispatch or triage</p>
                    </div>
                    <Link
                      href="/authority/incidents"
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors hover:underline"
                    >
                      View All <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  
                  <div className="flex-1 overflow-x-auto p-0">
                    {loading ? (
                      <div className="p-6"><SkeletonTable rows={5} /></div>
                    ) : incidents.length === 0 ? (
                      <div className="p-6 h-full flex flex-col items-center justify-center">
                        <EmptyState 
                          icon={CheckCircle2} 
                          title="No active incidents" 
                          message="There are no active incidents in the priority queue right now." 
                        />
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3.5 whitespace-nowrap">Priority</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Incident</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Location</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                            <th className="px-5 py-3.5 whitespace-nowrap text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {incidents.map((incident) => {
                            const isCritical = incident.severity === 'critical' || incident.priorityScore >= 40;

                            return (
                              <tr
                                key={incident._id}
                                className={`transition-colors duration-150 group ${
                                  isCritical
                                    ? 'bg-red-50/30 hover:bg-red-50/60'
                                    : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <PriorityBadge score={incident.priorityScore} />
                                </td>
                                <td className="px-5 py-3.5 min-w-[240px]">
                                  <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0 group-hover:scale-105 transition-transform border border-slate-200/60">
                                      {getDisasterIcon(incident.type)}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                        <span className="truncate max-w-[180px]" title={incident.title}>
                                          {incident.title}
                                        </span>
                                        {incident.isSOS && <SOSIndicator />}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <SeverityBadge severity={incident.severity} />
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatRelativeTime(incident.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{incident.district}, {incident.state}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <IncidentStatusBadge status={incident.status} />
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                  <Link 
                                    href={`/authority/incidents/${incident._id}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-150 text-xs font-bold shadow-2xs active:scale-[0.98]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Ops & Activity */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-6">
                {/* Response Operations Summary */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all duration-200 hover:border-slate-300">
                  <h2 className="text-base font-extrabold text-slate-900 mb-3.5 flex items-center gap-2 tracking-tight">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Response Operations
                  </h2>
                  {loading || !stats ? (
                    <div className="space-y-3">
                      <div className="h-[44px] bg-slate-100 rounded-xl w-full animate-pulse"></div>
                      <div className="h-[44px] bg-slate-100 rounded-xl w-full animate-pulse"></div>
                      <div className="h-[44px] bg-slate-100 rounded-xl w-full animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/80 transition-all duration-150 hover:bg-emerald-50 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <PulsingDot variant="live" size="sm" />
                          <span className="text-xs font-bold text-emerald-900">Available Teams</span>
                        </div>
                        <span className="text-base font-black font-mono text-emerald-700">{stats.activeResponseTeams}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100/80 transition-all duration-150 hover:bg-purple-50 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-bold text-purple-900">Active Dispatches</span>
                        </div>
                        <span className="text-base font-black font-mono text-purple-700">{stats.dispatchedIncidents}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-100/80 transition-all duration-150 hover:bg-blue-50 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-blue-900">In Action</span>
                        </div>
                        <span className="text-base font-black font-mono text-blue-700">{stats.inProgressIncidents || 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col flex-1 max-h-[480px] transition-all duration-200 hover:border-slate-300">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                      <Activity className="w-4 h-4 text-slate-500" />
                      Live Activity Feed
                    </h2>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Realtime
                    </span>
                  </div>
                  <div className="p-5 overflow-y-auto">
                    {loading ? (
                      <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[14px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="relative flex gap-3.5">
                            <div className="relative z-10 w-7 h-7 rounded-full bg-slate-200 animate-pulse shrink-0 border-2 border-white"></div>
                            <div className="space-y-1.5 w-full mt-0.5">
                              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                              <div className="h-2 bg-slate-100 rounded w-1/4 animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activities.length === 0 ? (
                      <EmptyState 
                        icon={Activity} 
                        title="No recent activity" 
                        message="Operations log is currently empty." 
                      />
                    ) : (
                      <div className="relative space-y-5 before:absolute before:inset-0 before:ml-[14px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                        {activities.map((activity) => (
                          <div key={activity._id} className="relative flex items-start gap-3.5 group">
                            <div className="relative z-10 w-7 h-7 rounded-full bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {getActivityIcon(activity.action)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-800 font-semibold leading-snug">{activity.description}</p>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {formatRelativeTime(activity.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}