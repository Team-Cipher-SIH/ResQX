'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import StatCard from '@/components/authority/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { getStateNames, INDIA_STATES } from '@/data/indiaStatesDistricts';
import CommandMap from '@/components/authority/CommandMap';
import type { Shelter, Supply } from '@/types/authority';
import { getShelterStatus, getSupplyStatusColor, getSupplyStatusLabel } from '@/types/authority';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import { MOCK_SUPPLIES_DATA } from '@/data/supplyMockData';
import {
  MapPin,
  AlertTriangle,
  Users,
  Shield,
  Search,
  ArrowRight,
  Filter,
  Activity,
  CheckCircle2,
  Building2,
  Send,
  Zap,
  Home,
  Package,
  Droplets,
  Utensils,
  HeartPulse,
  TrendingUp,
} from 'lucide-react';

interface DistrictOverviewItem {
  state: string;
  district: string;
  activeIncidents: number;
  criticalIncidents: number;
  respondersAvailable: number;
  totalTeams: number;
}

export default function StateOverviewPage() {
  const allStates = useMemo(() => getStateNames(), []);
  const [selectedState, setSelectedState] = useState<string>('');
  const [districtData, setDistrictData] = useState<DistrictOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'active'>('all');

  const [isStateLocked, setIsStateLocked] = useState(false);

  // Load user's default state from localStorage session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('resqtech_user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        const userState = parsed.jurisdictionState || parsed.state;
        const level = parsed.authorityLevel;

        if (level === 'state_admin' && userState) {
          setSelectedState(userState);
          setIsStateLocked(true);
          return;
        }

        if (userState && allStates.includes(userState)) {
          setSelectedState(userState);
          return;
        }
      }
    } catch {
      // ignore
    }
    if (allStates.length > 0 && !selectedState) {
      setSelectedState(allStates[0]);
    }
  }, [allStates, selectedState]);

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);

  const loadDistrictOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [distRes, sheltersRes, suppliesRes] = await Promise.all([
        fetchFromApi<DistrictOverviewItem[]>(API_ENDPOINTS.DASHBOARD_DISTRICTS),
        selectedState
          ? fetchFromApi<Shelter[]>(`${API_ENDPOINTS.SHELTERS}?state=${encodeURIComponent(selectedState)}`)
          : Promise.resolve({ success: false, data: [] } as any),
        selectedState
          ? fetchFromApi<Supply[]>(`${API_ENDPOINTS.SUPPLIES}?state=${encodeURIComponent(selectedState)}`)
          : Promise.resolve({ success: false, data: [] } as any),
      ]);

      if (distRes.success && distRes.data) {
        setDistrictData(Array.isArray(distRes.data) ? distRes.data : []);
      } else {
        setError(distRes.message || 'Failed to load district overview data.');
      }

      if (sheltersRes.success && sheltersRes.data && Array.isArray(sheltersRes.data)) {
        setShelters(sheltersRes.data);
      } else if (selectedState) {
        const fallback = MOCK_SHELTERS_DATA.filter(
          (s) => s.state.toLowerCase() === selectedState.toLowerCase()
        );
        setShelters(fallback.length > 0 ? fallback : MOCK_SHELTERS_DATA);
      }

      if (suppliesRes.success && suppliesRes.data && Array.isArray(suppliesRes.data)) {
        setSupplies(suppliesRes.data);
      } else if (selectedState) {
        const fallback = MOCK_SUPPLIES_DATA.filter(
          (s) => s.state.toLowerCase() === selectedState.toLowerCase()
        );
        setSupplies(fallback.length > 0 ? fallback : MOCK_SUPPLIES_DATA);
      }
    } catch (err: any) {
      if (selectedState) {
        const fallbackShelters = MOCK_SHELTERS_DATA.filter(
          (s) => s.state.toLowerCase() === selectedState.toLowerCase()
        );
        setShelters(fallbackShelters.length > 0 ? fallbackShelters : MOCK_SHELTERS_DATA);

        const fallbackSupplies = MOCK_SUPPLIES_DATA.filter(
          (s) => s.state.toLowerCase() === selectedState.toLowerCase()
        );
        setSupplies(fallbackSupplies.length > 0 ? fallbackSupplies : MOCK_SUPPLIES_DATA);
      }
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState) {
      loadDistrictOverview();
    }
  }, [selectedState]);

  // Compute all districts for the currently selected state
  const stateDistricts = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = INDIA_STATES.find((s) => s.name === selectedState);
    const districtNames = stateObj ? stateObj.districts : [];

    // Merge backend metrics with the district list
    return districtNames.map((dName) => {
      const metrics = districtData.find(
        (item) =>
          item.state.toLowerCase() === selectedState.toLowerCase() &&
          item.district.toLowerCase() === dName.toLowerCase()
      );
      return {
        district: dName,
        state: selectedState,
        activeIncidents: metrics ? metrics.activeIncidents : 0,
        criticalIncidents: metrics ? metrics.criticalIncidents : 0,
        totalTeams: metrics ? metrics.totalTeams : 0,
        respondersAvailable: metrics ? metrics.respondersAvailable : 0,
      };
    });
  }, [selectedState, districtData]);

  // Summary statistics for the chosen state
  const stateStats = useMemo(() => {
    return stateDistricts.reduce(
      (acc, curr) => {
        acc.totalActive += curr.activeIncidents;
        acc.totalCritical += curr.criticalIncidents;
        acc.totalTeams += curr.totalTeams;
        acc.totalResponders += curr.respondersAvailable;
        if (curr.activeIncidents > 0) acc.affectedDistricts += 1;
        return acc;
      },
      { totalActive: 0, totalCritical: 0, totalTeams: 0, totalResponders: 0, affectedDistricts: 0 }
    );
  }, [stateDistricts]);

  // Shelter Aggregation by District for the state
  const districtShelterBreakdown = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = INDIA_STATES.find((s) => s.name === selectedState);
    const districtNames = stateObj ? stateObj.districts : [];

    const result = districtNames.map((dName) => {
      const dShelters = shelters.filter(
        (s) =>
          s.district?.toLowerCase() === dName.toLowerCase() &&
          s.state?.toLowerCase() === selectedState.toLowerCase()
      );
      const shelterCount = dShelters.length;
      let totalCapacity = 0;
      let totalOccupancy = 0;

      dShelters.forEach((s) => {
        totalCapacity += s.capacity || 0;
        totalOccupancy += s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0;
      });

      const available = Math.max(0, totalCapacity - totalOccupancy);
      const occPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

      return {
        district: dName,
        shelterCount,
        totalCapacity,
        totalOccupancy,
        available,
        occPct,
      };
    });

    return result.filter((item) => item.shelterCount > 0);
  }, [selectedState, shelters]);

  // Total state shelter capacity
  const stateShelterTotals = useMemo(() => {
    let count = 0;
    let cap = 0;
    let occ = 0;
    shelters.forEach((s) => {
      if (s.state?.toLowerCase() === selectedState.toLowerCase()) {
        count++;
        cap += s.capacity || 0;
        occ += s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0;
      }
    });
    return {
      count,
      cap,
      occ,
      avail: Math.max(0, cap - occ),
      pct: cap > 0 ? Math.round((occ / cap) * 100) : 0,
    };
  }, [selectedState, shelters]);

  // District Supply Breakdown Matrix for State Grid
  const districtSupplyBreakdown = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = INDIA_STATES.find((s) => s.name === selectedState);
    const districtNames = stateObj ? stateObj.districts : [];

    const result = districtNames.map((dName) => {
      const dSupplies = supplies.filter(
        (s) =>
          s.district?.toLowerCase() === dName.toLowerCase() &&
          s.state?.toLowerCase() === selectedState.toLowerCase()
      );

      const waterItems = dSupplies.filter((s) => s.category.toLowerCase() === 'water');
      const foodItems = dSupplies.filter((s) => s.category.toLowerCase() === 'food');
      const medItems = dSupplies.filter(
        (s) => s.category.toLowerCase() === 'medicine' || s.category.toLowerCase() === 'first aid'
      );

      const calcCatScore = (items: Supply[]) => {
        if (items.length === 0) return { pct: 0, count: 0, status: 'NONE' };
        let totalQ = 0;
        let totalTarget = 0;
        let anyCritical = false;
        items.forEach((i) => {
          totalQ += i.quantity;
          totalTarget += Math.max(1, i.minimumStock * 2);
          if (i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK') anyCritical = true;
        });
        const pct = Math.min(100, Math.round((totalQ / totalTarget) * 100));
        const status = anyCritical ? 'CRITICAL' : pct >= 80 ? 'AVAILABLE' : 'LOW';
        return { pct, count: items.length, status };
      };

      const water = calcCatScore(waterItems);
      const food = calcCatScore(foodItems);
      const med = calcCatScore(medItems);
      const criticalCount = dSupplies.filter((s) => s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK').length;

      return {
        district: dName,
        totalItems: dSupplies.length,
        water,
        food,
        med,
        criticalCount,
      };
    });

    return result.filter((item) => item.totalItems > 0);
  }, [selectedState, supplies]);

  // Filtered districts based on search & severity
  const filteredDistricts = useMemo(() => {
    return stateDistricts.filter((d) => {
      const matchesSearch = d.district.toLowerCase().includes(searchFilter.toLowerCase());
      if (!matchesSearch) return false;
      if (severityFilter === 'critical') return d.criticalIncidents > 0;
      if (severityFilter === 'active') return d.activeIncidents > 0;
      return true;
    });
  }, [stateDistricts, searchFilter, severityFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader
        title="State Operations Overview"
        subtitle="Jurisdiction monitoring, district readiness, and emergency telemetry"
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* State Selection Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="state-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                {isStateLocked ? 'Assigned State Jurisdiction' : 'Select Active State'}
              </label>
              {isStateLocked ? (
                <div className="mt-0.5 text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedState}</span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Assigned
                  </span>
                </div>
              ) : (
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="mt-0.5 text-base font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer focus:ring-0 pr-8"
                >
                  {allStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/authority/district?state=${encodeURIComponent(selectedState)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              Open District Triage
            </Link>
          </div>
        </div>

        {/* State Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Active Incidents"
            value={stateStats.totalActive}
            color={stateStats.totalActive > 0 ? 'orange' : 'blue'}
          />
          <StatCard
            icon={Activity}
            label="Critical Incidents"
            value={stateStats.totalCritical}
            color={stateStats.totalCritical > 0 ? 'red' : 'emerald'}
          />
          <StatCard
            icon={Building2}
            label="Districts Affected"
            value={`${stateStats.affectedDistricts} / ${stateDistricts.length}`}
            color="purple"
          />
          <StatCard
            icon={Users}
            label="Response Units Active"
            value={stateStats.totalTeams}
            color="emerald"
          />
        </div>

        {/* State Shelter Overview Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  State Shelter & Relief Grid &mdash; {selectedState}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total {stateShelterTotals.count} active facilities across districts &bull; {stateShelterTotals.avail.toLocaleString()} available beds
                </p>
              </div>
            </div>

            <Link
              href="/authority/shelters"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto hover:underline"
            >
              Shelter Operations Hub <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Top Shelter KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">State Shelters</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{stateShelterTotals.count}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Bed Capacity</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{stateShelterTotals.cap.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Occupied Beds</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{stateShelterTotals.occ.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Available Vacancies</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">{stateShelterTotals.avail.toLocaleString()}</span>
            </div>
          </div>

          {/* District Shelter Breakdown Cards Grid */}
          {districtShelterBreakdown.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                District Capacity Distribution
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {districtShelterBreakdown.map((item) => (
                  <div
                    key={item.district}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{item.district}</h4>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                        {item.shelterCount} {item.shelterCount === 1 ? 'shelter' : 'shelters'}
                      </span>
                    </div>

                    <div className="text-[11px] space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <b className="font-mono text-slate-900">{item.totalCapacity.toLocaleString()}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Occupied:</span>
                        <b className="font-mono text-slate-700">{item.totalOccupancy.toLocaleString()}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <b className="font-mono text-emerald-700">{item.available.toLocaleString()}</b>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.occPct >= 100 ? 'bg-red-500' : item.occPct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(item.occPct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* State Relief Supply & Logistics Summary Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  State Relief Supply & Logistics Summary &mdash; {selectedState}
                </h3>
                <p className="text-[11px] text-slate-500">
                  District readiness levels across Water, Food, and Medicine reserves
                </p>
              </div>
            </div>

            <Link
              href="/authority/supplies"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto hover:underline"
            >
              Supply Inventory Hub <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* District Supply Matrix Grid */}
          {districtSupplyBreakdown.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No relief supply telemetry records found for {selectedState}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {districtSupplyBreakdown.map((dItem) => (
                <div
                  key={dItem.district}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <h4 className="font-bold text-xs text-slate-900">{dItem.district}</h4>
                    </div>
                    <Link
                      href={`/authority/district?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
                        dItem.district
                      )}`}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Drill Down</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>

                  {/* 3 Categories Scorebars */}
                  <div className="space-y-2 text-[11px]">
                    {/* Water */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-blue-500" />
                          <span>Water:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-900">{dItem.water.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dItem.water.pct >= 75 ? 'bg-blue-600' : dItem.water.pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(4, dItem.water.pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Food */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center gap-1">
                          <Utensils className="w-3 h-3 text-amber-500" />
                          <span>Food:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-900">{dItem.food.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dItem.food.pct >= 75 ? 'bg-emerald-600' : dItem.food.pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(4, dItem.food.pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Medicine */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center gap-1">
                          <HeartPulse className="w-3 h-3 text-red-500" />
                          <span>Medicine:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-900">{dItem.med.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dItem.med.pct >= 75 ? 'bg-emerald-600' : dItem.med.pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(4, dItem.med.pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {dItem.criticalCount > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{dItem.criticalCount} critical / depleted items</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive State Operational Map */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                State Operational Map &mdash; {selectedState}
              </h2>
              <p className="text-xs text-slate-500">
                Geospatial operational telemetry across districts in {selectedState}
              </p>
            </div>
          </div>
          <CommandMap
            scope="state"
            state={selectedState}
            shelters={shelters}
            height="420px"
          />
        </div>

        {/* District Breakdown Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">District Operations Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time situational awareness across all {stateDistricts.length} districts in {selectedState}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search district..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all w-44"
                />
              </div>

              {/* Status Filter */}
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    severityFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({stateDistricts.length})
                </button>
                <button
                  onClick={() => setSeverityFilter('active')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    severityFilter === 'active'
                      ? 'bg-white text-orange-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({stateDistricts.filter((d) => d.activeIncidents > 0).length})
                </button>
                <button
                  onClick={() => setSeverityFilter('critical')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    severityFilter === 'critical'
                      ? 'bg-white text-red-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Critical ({stateDistricts.filter((d) => d.criticalIncidents > 0).length})
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12">
              <LoadingState message="Aggregating state district telemetries..." />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState message={error} onRetry={loadDistrictOverview} />
            </div>
          ) : filteredDistricts.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={CheckCircle2}
                title="No matching districts"
                description="No districts found matching your current filter criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">District</th>
                    <th className="px-6 py-3.5">Active Incidents</th>
                    <th className="px-6 py-3.5">Critical Severity</th>
                    <th className="px-6 py-3.5">Response Teams</th>
                    <th className="px-6 py-3.5">Responders</th>
                    <th className="px-6 py-3.5 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredDistricts.map((item) => {
                    const isHighAlert = item.criticalIncidents > 0;
                    const isMediumAlert = item.activeIncidents > 0;

                    return (
                      <tr
                        key={item.district}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isHighAlert ? 'bg-red-50/20' : isMediumAlert ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-900 text-sm">{item.district}</span>
                            {isHighAlert && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                CRITICAL
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.activeIncidents > 0
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.activeIncidents} Active
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.criticalIncidents > 0
                                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {item.criticalIncidents} Critical
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-slate-800 font-semibold">{item.totalTeams} Teams</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-slate-800 font-semibold">{item.respondersAvailable} Ready</span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/authority/district?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
                              item.district
                            )}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg font-semibold transition-colors"
                          >
                            Inspect <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
