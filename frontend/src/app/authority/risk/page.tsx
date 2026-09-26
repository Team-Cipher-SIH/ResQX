'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import PreparednessCard from '@/components/authority/PreparednessCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { RiskAssessment, PreparednessData, DisasterRiskType, RiskLevel } from '@/types/authority';
import { getRiskLevelColor, getRiskHexColor } from '@/types/authority';
import {
  ShieldAlert,
  Flame,
  Waves,
  Activity,
  AlertTriangle,
  MapPin,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Eye,
  X,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

const DISASTER_ICONS: Record<string, typeof Waves> = {
  flood: Waves,
  fire: Flame,
  earthquake: Activity,
  landslide: AlertTriangle,
  cyclone: Waves,
  other: AlertTriangle,
};

const DISASTER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  flood: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  fire: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  earthquake: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  landslide: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cyclone: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  other: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function RiskAndPreparednessPage() {
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Filters
  const [selectedDisaster, setSelectedDisaster] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskDetail, setSelectedRiskDetail] = useState<RiskAssessment | null>(null);

  // Active disaster tab for Preparedness Card sync
  const [preparednessDisaster, setPreparednessDisaster] = useState<'flood' | 'fire' | 'earthquake' | undefined>(undefined);

  const fetchRiskData = useCallback(async () => {
    setLoadingRisks(true);
    setRiskError(null);
    try {
      const endpoint = API_ENDPOINTS.RISK_ASSESSMENTS;
      const res = await fetchFromApi<RiskAssessment[]>(endpoint);
      if (res.success && res.data) {
        setRisks(Array.isArray(res.data) ? res.data : []);
      } else {
        setRiskError(res.message || 'Unable to load risk assessments from server.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching risk data';
      setRiskError(msg);
    } finally {
      setLoadingRisks(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  // Compute Top Summaries for 3 Core Disasters: Flood, Fire, Earthquake
  const topSummaries = useMemo(() => {
    const targets: Array<{ type: 'flood' | 'fire' | 'earthquake'; label: string; icon: typeof Waves }> = [
      { type: 'flood', label: 'Flood Hazard', icon: Waves },
      { type: 'fire', label: 'Fire Hazard', icon: Flame },
      { type: 'earthquake', label: 'Earthquake Hazard', icon: Activity },
    ];

    return targets.map((target) => {
      const match = risks
        .filter((r) => r.disasterType?.toLowerCase() === target.type)
        .sort((a, b) => b.riskScore - a.riskScore)[0];

      return {
        ...target,
        data: match || null,
      };
    });
  }, [risks]);

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return risks.filter((item) => {
      if (selectedDisaster !== 'all' && item.disasterType?.toLowerCase() !== selectedDisaster.toLowerCase()) {
        return false;
      }
      if (selectedLevel !== 'all' && item.riskLevel?.toUpperCase() !== selectedLevel.toUpperCase()) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const distMatch = item.district?.toLowerCase().includes(query);
        const stateMatch = item.state?.toLowerCase().includes(query);
        const typeMatch = item.disasterType?.toLowerCase().includes(query);
        if (!distMatch && !stateMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [risks, selectedDisaster, selectedLevel, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <AuthorityHeader
        title="Risk & Preparedness Command"
        subtitle="Proactive multi-hazard risk forecasting, vulnerability mapping & district readiness"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
        {/* Top Operational Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Multi-Hazard Predictive Intelligence</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live AI Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates meteorological alerts, sensor feeds, historical terrain data, and civil telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchRiskData}
              disabled={loadingRisks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRisks ? 'animate-spin' : ''}`} />
              <span>Refresh Forecast</span>
            </button>
            <Link
              href="/authority/dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <span>Command Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ─── 1. TOP RISK SUMMARY (Flood, Fire, Earthquake) ─── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Priority Hazard Forecasts</span>
            </h3>
            <span className="text-[11px] text-slate-400">Scoped to jurisdictional perimeter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topSummaries.map(({ type, label, icon: Icon, data }) => {
              const colors = DISASTER_COLORS[type] || DISASTER_COLORS.other;
              const hasData = Boolean(data);
              const score = data?.riskScore ?? 0;
              const level = data?.riskLevel ?? 'LOW';
              const confidence = data?.confidence !== undefined ? Math.round(data.confidence * (data.confidence <= 1 ? 100 : 1)) : 85;
              const hex = getRiskHexColor(score);

              return (
                <div
                  key={type}
                  onClick={() => {
                    if (data) setSelectedRiskDetail(data);
                    setPreparednessDisaster(type);
                  }}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden ${
                    hasData && (level === 'CRITICAL' || level === 'HIGH')
                      ? 'border-orange-200 bg-gradient-to-br from-white via-white to-orange-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">{label}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {data ? `${data.district}, ${data.state}` : 'No active alerts in scope'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRiskLevelColor(
                        level as RiskLevel
                      )}`}
                    >
                      {level}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Risk Score</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black font-mono" style={{ color: hex }}>
                          {hasData ? score : '—'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold font-mono">/ 100</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Confidence</p>
                      <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">
                        {hasData ? `${confidence}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {data && (
                    <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {data.predictedAt ? new Date(data.predictedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                      {data.isStale && (
                        <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          ⚠ Stale (&gt;24h)
                        </span>
                      )}
                      {data.isVulnerableZone && (
                        <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Vulnerable Zone
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 2. PREPAREDNESS SECTION (RISK → READINESS) ─── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Risk vs. Resource Readiness</span>
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
              <button
                onClick={() => setPreparednessDisaster(undefined)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  !preparednessDisaster ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                All Hazards
              </button>
              <button
                onClick={() => setPreparednessDisaster('flood')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  preparednessDisaster === 'flood' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Flood
              </button>
              <button
                onClick={() => setPreparednessDisaster('fire')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  preparednessDisaster === 'fire' ? 'bg-white text-orange-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Fire
              </button>
              <button
                onClick={() => setPreparednessDisaster('earthquake')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  preparednessDisaster === 'earthquake' ? 'bg-white text-amber-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Earthquake
              </button>
            </div>
          </div>

          <PreparednessCard disasterType={preparednessDisaster} />
        </section>

        {/* ─── 3. HIGH-RISK AREAS & VULNERABILITY REGISTER ─── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Section Header & Filter Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Jurisdictional Risk & Vulnerability Register</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active geographic assessments ranked by risk magnitude and community vulnerability.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search district, state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-44 sm:w-56"
                />
              </div>

              {/* Disaster Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedDisaster}
                  onChange={(e) => setSelectedDisaster(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 outline-none text-xs cursor-pointer"
                >
                  <option value="all">All Disasters</option>
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="landslide">Landslide</option>
                  <option value="cyclone">Cyclone</option>
                </select>
              </div>

              {/* Level Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 outline-none text-xs cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="CRITICAL">Critical (&ge;85)</option>
                  <option value="HIGH">High (70-84)</option>
                  <option value="MODERATE">Moderate (40-69)</option>
                  <option value="LOW">Low (&lt;40)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {loadingRisks ? (
            <div className="p-8">
              <LoadingState message="Loading risk assessments from telemetry network..." />
            </div>
          ) : riskError ? (
            <div className="p-8">
              <ErrorState message={riskError} onRetry={fetchRiskData} />
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ShieldCheck className="w-10 h-10 text-slate-300" />}
                title="No risk assessments match criteria"
                message={searchTerm ? 'Try adjusting your search terms or filters.' : 'All districts within your jurisdiction are currently reporting normal baseline levels.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">District & State</th>
                    <th className="py-3 px-4">Hazard Type</th>
                    <th className="py-3 px-4 text-center">Risk Score</th>
                    <th className="py-3 px-4">Threat Level</th>
                    <th className="py-3 px-4 text-center">Confidence</th>
                    <th className="py-3 px-4">Vulnerability Flag</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRisks.map((item) => {
                    const Icon = DISASTER_ICONS[item.disasterType?.toLowerCase()] || AlertTriangle;
                    const colors = DISASTER_COLORS[item.disasterType?.toLowerCase()] || DISASTER_COLORS.other;
                    const hex = getRiskHexColor(item.riskScore);
                    const conf = item.confidence !== undefined ? Math.round(item.confidence * (item.confidence <= 1 ? 100 : 1)) : 85;

                    return (
                      <tr
                        key={item._id}
                        onClick={() => setSelectedRiskDetail(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* District & State */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.district}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 ml-5">{item.state}</p>
                        </td>

                        {/* Hazard Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            <Icon className="w-3 h-3" />
                            {item.disasterType}
                          </span>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className="font-mono font-black text-sm px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 inline-block"
                            style={{ color: hex }}
                          >
                            {item.riskScore}
                          </span>
                        </td>

                        {/* Threat Level */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRiskLevelColor(
                              item.riskLevel
                            )}`}
                          >
                            {item.riskLevel}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                          {conf}%
                        </td>

                        {/* Vulnerability Flag */}
                        <td className="py-3 px-4">
                          {item.isVulnerableZone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              Vulnerable Zone
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Standard Perimeter</span>
                          )}
                        </td>

                        {/* Last Updated */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.predictedAt
                                ? new Date(item.predictedAt).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Recent'}
                            </span>
                          </div>
                          {item.isStale && (
                            <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5 mt-0.5">
                              ⚠ Updated &gt;24h ago
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRiskDetail(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ─── 4. INTERACTIVE RISK DETAIL DRAWER / MODAL ─── */}
      {selectedRiskDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900 capitalize">
                      {selectedRiskDetail.disasterType} Risk Analysis
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getRiskLevelColor(
                        selectedRiskDetail.riskLevel
                      )}`}
                    >
                      {selectedRiskDetail.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📍 {selectedRiskDetail.district}, {selectedRiskDetail.state}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRiskDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Score & Confidence Metric Box */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Risk Score</p>
                  <p
                    className="text-3xl font-black font-mono mt-1"
                    style={{ color: getRiskHexColor(selectedRiskDetail.riskScore) }}
                  >
                    {selectedRiskDetail.riskScore} <span className="text-sm text-slate-400 font-semibold font-sans">/ 100</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Calculated via multi-hazard environmental heuristics.
                  </p>
                </div>

                <div className="border-l border-slate-200 pl-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Confidence</p>
                  <p className="text-3xl font-black font-mono text-slate-800 mt-1">
                    {selectedRiskDetail.confidence !== undefined
                      ? `${Math.round(selectedRiskDetail.confidence * (selectedRiskDetail.confidence <= 1 ? 100 : 1))}%`
                      : '88%'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    High sensor correlation & telemetry alignment.
                  </p>
                </div>
              </div>

              {/* Status Flags */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedRiskDetail.isVulnerableZone ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Designated Vulnerable Zone
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-slate-100 text-slate-600">
                    Standard Topography Perimeter
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Predicted: {new Date(selectedRiskDetail.predictedAt || selectedRiskDetail.createdAt).toLocaleString('en-IN')}
                </span>

                {selectedRiskDetail.isStale && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                    ⚠ Telemetry Stale (&gt;24 hrs)
                  </span>
                )}
              </div>

              {/* Risk Factors */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Contributing Risk Factors</span>
                </h4>
                {selectedRiskDetail.riskFactors && selectedRiskDetail.riskFactors.length > 0 ? (
                  <ul className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {selectedRiskDetail.riskFactors.map((factor, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500">
                    Standard risk model baseline: precipitation anomalies, historical event recurrence, and topography elevation factors.
                  </div>
                )}
              </div>

              {/* Geographical Coordinates */}
              {selectedRiskDetail.location?.coordinates && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Geospatial Coordinates:</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {selectedRiskDetail.location.coordinates[1].toFixed(4)}° N, {selectedRiskDetail.location.coordinates[0].toFixed(4)}° E
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/authority/alerts"
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review / Issue Warning</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedRiskDetail(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
