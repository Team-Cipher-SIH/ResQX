'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import StatCard from '@/components/authority/StatCard';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';
import CommandMap from '@/components/authority/CommandMap';
import type { Incident, ResponseTeam, Shelter, Supply } from '@/types/authority';
import { getShelterStatus, getSupplyStatusColor, getSupplyStatusLabel } from '@/types/authority';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import { MOCK_SUPPLIES_DATA } from '@/data/supplyMockData';
import {
  Building2,
  MapPin,
  AlertTriangle,
  Users,
  Send,
  Eye,
  CheckCircle2,
  Phone,
  Shield,
  ArrowRight,
  Home,
  Package,
  Droplets,
  Utensils,
  HeartPulse,
  Bed,
  TrendingUp,
} from 'lucide-react';

function DistrictOperationsContent() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get('state');
  const districtParam = searchParams.get('district');

  const allStates = useMemo(() => getStateNames(), []);
  const [selectedState, setSelectedState] = useState<string>(stateParam || '');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(districtParam || '');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available districts for the chosen state
  const availableDistricts = useMemo(() => {
    if (!selectedState) return [];
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  const [isJurisdictionLocked, setIsJurisdictionLocked] = useState(false);

  // Initialize state & district from user data or fallback
  useEffect(() => {
    try {
      const stored = localStorage.getItem('resqtech_user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        const userState = parsed.jurisdictionState || parsed.state;
        const userDistrict = parsed.jurisdictionDistrict || parsed.district;
        const level = parsed.authorityLevel;

        if (level === 'district_admin' && userState && userDistrict) {
          setSelectedState(userState);
          setSelectedDistrict(userDistrict);
          setIsJurisdictionLocked(true);
          return;
        }

        if (userState && allStates.includes(userState)) {
          setSelectedState(userState);
          if (userDistrict) {
            setSelectedDistrict(userDistrict);
          }
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

  // Adjust selected district when state changes
  useEffect(() => {
    if (availableDistricts.length > 0) {
      if (!selectedDistrict || !availableDistricts.includes(selectedDistrict)) {
        setSelectedDistrict(availableDistricts[0]);
      }
    }
  }, [availableDistricts, selectedDistrict]);

  const [supplies, setSupplies] = useState<Supply[]>([]);

  const loadDistrictData = async () => {
    if (!selectedState || !selectedDistrict) return;
    setLoading(true);
    setError(null);
    try {
      const [incidentsRes, teamsRes, sheltersRes, suppliesRes] = await Promise.all([
        fetchFromApi<Incident[]>(
          `${API_ENDPOINTS.INCIDENTS}?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
            selectedDistrict
          )}&limit=50`
        ),
        fetchFromApi<ResponseTeam[]>(
          `${API_ENDPOINTS.TEAMS}?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
            selectedDistrict
          )}`
        ),
        fetchFromApi<Shelter[]>(
          `${API_ENDPOINTS.SHELTERS}?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
            selectedDistrict
          )}`
        ),
        fetchFromApi<Supply[]>(
          `${API_ENDPOINTS.SUPPLIES}?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
            selectedDistrict
          )}`
        ),
      ]);

      if (incidentsRes.success && incidentsRes.data) {
        const list = Array.isArray(incidentsRes.data)
          ? incidentsRes.data
          : (incidentsRes.data as any).incidents || [];
        setIncidents(list);
      }

      if (teamsRes.success && teamsRes.data) {
        const teamList = Array.isArray(teamsRes.data)
          ? teamsRes.data
          : (teamsRes.data as any).teams || [];
        setTeams(teamList);
      }

      if (sheltersRes.success && sheltersRes.data && Array.isArray(sheltersRes.data)) {
        setShelters(sheltersRes.data);
      } else {
        const fallback = MOCK_SHELTERS_DATA.filter(
          (s) =>
            s.state.toLowerCase() === selectedState.toLowerCase() &&
            s.district.toLowerCase() === selectedDistrict.toLowerCase()
        );
        setShelters(fallback.length > 0 ? fallback : MOCK_SHELTERS_DATA);
      }

      if (suppliesRes.success && suppliesRes.data && Array.isArray(suppliesRes.data)) {
        setSupplies(suppliesRes.data);
      } else {
        const fallbackSupplies = MOCK_SUPPLIES_DATA.filter(
          (s) =>
            s.state.toLowerCase() === selectedState.toLowerCase() &&
            s.district.toLowerCase() === selectedDistrict.toLowerCase()
        );
        setSupplies(fallbackSupplies.length > 0 ? fallbackSupplies : MOCK_SUPPLIES_DATA);
      }
    } catch (err: any) {
      const fallback = MOCK_SHELTERS_DATA.filter(
        (s) =>
          s.state.toLowerCase() === selectedState.toLowerCase() &&
          s.district.toLowerCase() === selectedDistrict.toLowerCase()
      );
      setShelters(fallback.length > 0 ? fallback : MOCK_SHELTERS_DATA);

      const fallbackSupplies = MOCK_SUPPLIES_DATA.filter(
        (s) =>
          s.state.toLowerCase() === selectedState.toLowerCase() &&
          s.district.toLowerCase() === selectedDistrict.toLowerCase()
      );
      setSupplies(fallbackSupplies.length > 0 ? fallbackSupplies : MOCK_SUPPLIES_DATA);

      setError(err.message || 'Failed to load district operational data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      loadDistrictData();
    }
  }, [selectedState, selectedDistrict]);

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
  const criticalIncidents = activeIncidents.filter((i) => i.severity === 'critical');
  const activeTeams = teams.filter((t) => t.status === 'available' || t.status === 'busy');

  // Compute District Shelter Stats
  const shelterStats = useMemo(() => {
    let total = shelters.length;
    let active = 0;
    let totalCap = 0;
    let totalOcc = 0;
    let nearCap = 0;
    let full = 0;

    shelters.forEach((s) => {
      if (s.isActive !== false) active++;
      const cap = s.capacity || 0;
      const occ = s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0;
      totalCap += cap;
      totalOcc += occ;

      const st = getShelterStatus(s);
      if (st === 'near_capacity') nearCap++;
      if (st === 'full') full++;
    });

    const avail = Math.max(0, totalCap - totalOcc);
    const occPct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

    return { total, active, totalCap, totalOcc, avail, nearCap, full, occPct };
  }, [shelters]);

  // Compute District Relief Supply Metrics
  const supplyStats = useMemo(() => {
    let total = supplies.length;
    let availableCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;

    let waterQty = 0;
    let waterUnit = 'L';
    let foodQty = 0;
    let foodUnit = 'kits';
    let medicineQty = 0;
    let medicineUnit = 'kits';
    let blanketQty = 0;

    let waterStatus = 'AVAILABLE';
    let foodStatus = 'AVAILABLE';
    let medicineStatus = 'AVAILABLE';

    supplies.forEach((s) => {
      if (s.status === 'AVAILABLE') availableCount++;
      else if (s.status === 'LOW') lowCount++;
      else if (s.status === 'CRITICAL') criticalCount++;
      else if (s.status === 'OUT_OF_STOCK') outOfStockCount++;

      const cat = s.category.toLowerCase();
      if (cat === 'water') {
        waterQty += s.quantity;
        waterUnit = s.unit;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') waterStatus = s.status;
        else if (s.status === 'LOW' && waterStatus !== 'CRITICAL' && waterStatus !== 'OUT_OF_STOCK') waterStatus = 'LOW';
      } else if (cat === 'food') {
        foodQty += s.quantity;
        foodUnit = s.unit;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') foodStatus = s.status;
        else if (s.status === 'LOW' && foodStatus !== 'CRITICAL' && foodStatus !== 'OUT_OF_STOCK') foodStatus = 'LOW';
      } else if (cat === 'medicine' || cat === 'first aid') {
        medicineQty += s.quantity;
        medicineUnit = s.unit;
        if (s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK') medicineStatus = s.status;
        else if (s.status === 'LOW' && medicineStatus !== 'CRITICAL' && medicineStatus !== 'OUT_OF_STOCK') medicineStatus = 'LOW';
      } else if (cat === 'blankets') {
        blanketQty += s.quantity;
      }
    });

    return {
      total,
      availableCount,
      lowCount,
      criticalCount,
      outOfStockCount,
      waterQty,
      waterUnit,
      waterStatus,
      foodQty,
      foodUnit,
      foodStatus,
      medicineQty,
      medicineUnit,
      medicineStatus,
      blanketQty,
    };
  }, [supplies]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader
        title="District Operations Command"
        subtitle="Localized incident triage, response squad deployment, and sector management"
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* State & District Selector Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">State</label>
                {isJurisdictionLocked ? (
                  <span className="text-sm font-bold text-slate-900 block">{selectedState}</span>
                ) : (
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      const newDistricts = getDistrictsForState(e.target.value);
                      if (newDistricts.length > 0) setSelectedDistrict(newDistricts[0]);
                    }}
                    className="text-sm font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer pr-4"
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

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">District</label>
                {isJurisdictionLocked ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">{selectedDistrict}</span>
                    <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded uppercase">
                      Assigned
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="text-sm font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer pr-4"
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {!isJurisdictionLocked && (
            <div className="flex items-center gap-2">
              <Link
                href={`/authority/state`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to State View
              </Link>
            </div>
          )}
        </div>

        {/* Operational Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Active Sector Incidents"
            value={activeIncidents.length}
            color={activeIncidents.length > 0 ? 'orange' : 'blue'}
          />
          <StatCard
            icon={Shield}
            label="Critical Threats"
            value={criticalIncidents.length}
            color={criticalIncidents.length > 0 ? 'red' : 'emerald'}
          />
          <StatCard
            icon={Users}
            label="Stationed Response Teams"
            value={teams.length}
            color="purple"
          />
          <StatCard
            icon={CheckCircle2}
            label="Units Deployed"
            value={activeTeams.length}
            color="emerald"
          />
        </div>

        {/* Relief & Shelter Capacity Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Relief & Shelter Capacity &mdash; {selectedDistrict}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Safe havens, emergency triage camps, and vacant beds in this district
                </p>
              </div>
            </div>

            <Link
              href="/authority/shelters"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto hover:underline"
            >
              Manage Shelters <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Shelters</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{shelterStats.total}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Camps</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-0.5 block">{shelterStats.active}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Capacity</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{shelterStats.totalCap.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Available Beds</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">{shelterStats.avail.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Near Cap (&gt;85%)</span>
              <span className="text-xl font-bold font-mono text-amber-600 mt-0.5 block">{shelterStats.nearCap}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Full Shelters</span>
              <span className="text-xl font-bold font-mono text-red-600 mt-0.5 block">{shelterStats.full}</span>
            </div>
          </div>
        </div>

        {/* RELIEF SUPPLY STATUS SECTION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Relief Supply Status & Readiness &mdash; {selectedDistrict}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Essential disaster supplies across local relief camps &bull; {supplyStats.total} tracked supply records
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

          {/* Key Resource Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Water */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>Drinking Water</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getSupplyStatusColor(
                    supplyStats.waterStatus as any
                  )}`}
                >
                  {getSupplyStatusLabel(supplyStats.waterStatus as any)}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">
                  {supplyStats.waterQty.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">{supplyStats.waterUnit}</span>
              </div>
              <p className="text-[10px] text-slate-400">Available potable reserve in sector</p>
            </div>

            {/* Food Kits */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Rations & Food</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getSupplyStatusColor(
                    supplyStats.foodStatus as any
                  )}`}
                >
                  {getSupplyStatusLabel(supplyStats.foodStatus as any)}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">
                  {supplyStats.foodQty.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">{supplyStats.foodUnit}</span>
              </div>
              <p className="text-[10px] text-slate-400">Emergency meal kits & grains</p>
            </div>

            {/* Medicine */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <HeartPulse className="w-4 h-4 text-red-600" />
                  <span>Medical / First Aid</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getSupplyStatusColor(
                    supplyStats.medicineStatus as any
                  )}`}
                >
                  {getSupplyStatusLabel(supplyStats.medicineStatus as any)}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">
                  {supplyStats.medicineQty.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">{supplyStats.medicineUnit}</span>
              </div>
              <p className="text-[10px] text-slate-400">Triage & surgical essentials</p>
            </div>

            {/* Blankets */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Bed className="w-4 h-4 text-indigo-600" />
                  <span>Fleece Blankets</span>
                </div>
                <span className="px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                  Tracked
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">
                  {supplyStats.blanketQty.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">pieces</span>
              </div>
              <p className="text-[10px] text-slate-400">Shelter bedding & warmth gear</p>
            </div>
          </div>

          {/* Quick Inventory Summary Line */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[11px]">Stock Status Overview:</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {supplyStats.availableCount} Available
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {supplyStats.lowCount} Low Stock
            </span>
            <span className="flex items-center gap-1 text-orange-700">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {supplyStats.criticalCount} Critical
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {supplyStats.outOfStockCount} Depleted
            </span>
          </div>
        </div>

        {/* Interactive District Operational Map */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                Sector Operational Map &mdash; {selectedDistrict}, {selectedState}
              </h2>
              <p className="text-xs text-slate-500">
                Real-time tactical positioning of active hazards, relief centers, and deployed units
              </p>
            </div>
          </div>
          <CommandMap
            scope="district"
            state={selectedState}
            district={selectedDistrict}
            incidents={incidents}
            teams={teams}
            shelters={shelters}
            height="420px"
          />
        </div>

        {/* Content Tabs / Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incidents Queue in this District */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">District Incident Feed</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live emergencies reported in {selectedDistrict}, {selectedState}
                  </p>
                </div>
                <Link
                  href="/authority/incidents"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  All Incidents <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="p-12">
                  <LoadingState message="Fetching local sector reports..." />
                </div>
              ) : error ? (
                <div className="p-6">
                  <ErrorState message={error} onRetry={loadDistrictData} />
                </div>
              ) : incidents.length === 0 ? (
                <div className="p-12 flex-1 flex flex-col items-center justify-center">
                  <EmptyState
                    icon={CheckCircle2}
                    title="Sector Clear"
                    description={`No recorded incidents currently in ${selectedDistrict}.`}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">Priority</th>
                        <th className="px-6 py-3.5">Title & Type</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {incidents.map((incident) => (
                        <tr key={incident._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <PriorityBadge score={incident.priorityScore} />
                          </td>
                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{incident.title}</span>
                              {incident.isSOS && <SOSIndicator />}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <SeverityBadge severity={incident.severity} />
                              <span className="text-[11px] text-slate-400 capitalize">{incident.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <IncidentStatusBadge status={incident.status} />
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Link
                              href={`/authority/incidents/${incident._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </Link>
                            <Link
                              href={`/authority/dispatches?incident=${incident._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" /> Dispatch
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Teams Operating in this District */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">District Units</h3>
                  <p className="text-[11px] text-slate-400">Response teams in {selectedDistrict}</p>
                </div>
                <Link
                  href="/authority/teams"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Manage
                </Link>
              </div>

              {loading ? (
                <div className="py-8">
                  <LoadingState message="Loading squad units..." />
                </div>
              ) : teams.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <EmptyState
                    icon={Users}
                    title="No units registered"
                    description={`No designated response teams stationed in ${selectedDistrict} yet.`}
                  />
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[480px]">
                  {teams.map((team) => (
                    <div
                      key={team._id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{team.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            team.status === 'available'
                              ? 'bg-emerald-100 text-emerald-700'
                              : team.status === 'busy'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {team.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 capitalize">Specialty: {team.type}</p>
                      {typeof team.leader === 'object' && (team.leader as any)?.phone && (
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {(team.leader as any).phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DistrictOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <LoadingState message="Loading district operations..." />
        </div>
      }
    >
      <DistrictOperationsContent />
    </Suspense>
  );
}
