'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { IncidentStatusBadge, SeverityBadge, PriorityBadge, SOSIndicator } from '@/components/authority/Badges';
import IncidentTimeline from '@/components/authority/IncidentTimeline';
import { LoadingState, ErrorState } from '@/components/authority/LoadingStates';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import type { Incident, StatusHistoryEntry } from '@/types/authority';
import { ArrowLeft, MapPin, Clock, User, Shield, AlertTriangle, Image as ImageIcon, Send, Phone, Mail, Navigation2, Sparkles, CheckCircle2, XCircle, AlertCircle, RefreshCw, Bot } from 'lucide-react';
import { format } from 'date-fns';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);

  const fetchIncidentDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFromApi<Incident>(API_ENDPOINTS.INCIDENT_DETAIL(id));
      if (res.success && res.data) {
        setIncident(res.data);
        // If AI analysis hasn't been run yet, automatically trigger it
        if (!res.data.aiAnalysis) {
          triggerAiScan(id);
        }
      } else {
        setError(res.message || 'Failed to fetch incident details');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching incident details');
    } finally {
      setLoading(false);
    }
  };

  const triggerAiScan = async (incidentId: string) => {
    setIsAiScanning(true);
    try {
      const res = await fetchFromApi<{
        authenticity: 'LIKELY_GENUINE' | 'SUSPICIOUS_OR_PRANK' | 'NEEDS_PHYSICAL_VERIFICATION';
        credibilityScore: number;
        confidence: number;
        reasoning: string;
        recommendedAction?: string;
        suggestedUnit?: string;
        analyzedAt?: string;
      }>(API_ENDPOINTS.AI_VERIFY_INCIDENT(incidentId), { method: 'POST' });

      if (res.success && res.data) {
        setIncident((prev: Incident | null) => (prev ? { ...prev, aiAnalysis: res.data } : prev));
      }
    } catch (err) {
      console.warn('AI Scan trigger failed:', err);
    } finally {
      setIsAiScanning(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchIncidentDetail();
    }
  }, [id]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetchFromApi(API_ENDPOINTS.VERIFY_INCIDENT(id), { method: 'PATCH' });
      if (res.success) {
        fetchIncidentDetail();
      } else {
        alert(res.message || 'Failed to verify incident');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying incident');
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <AuthorityHeader />
        <main className="flex-1 p-6 flex items-center justify-center">
          <LoadingState message="Loading incident details..." />
        </main>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <AuthorityHeader />
        <main className="flex-1 p-6 flex items-center justify-center">
          <ErrorState message={error || 'Incident not found'} onRetry={fetchIncidentDetail} />
        </main>
      </div>
    );
  }

  // Generate timeline history if none exists
  const history: StatusHistoryEntry[] = incident.statusHistory && incident.statusHistory.length > 0
    ? incident.statusHistory
    : [{ status: 'reported', timestamp: incident.createdAt, note: 'Incident reported' }];

  // Helper for reporter info
  const reporterInfo = typeof incident.reportedBy === 'object' ? incident.reportedBy : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-12">
      <AuthorityHeader />
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/authority/incidents')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">{incident.title}</h1>
                <IncidentStatusBadge status={incident.status} />
                <SeverityBadge severity={incident.severity} />
                {incident.isSOS && <SOSIndicator />}
              </div>
              <p className="text-sm text-slate-500 mt-1 font-mono">ID: {incident._id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {incident.status === 'reported' && (
              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all duration-180 hover:shadow-xs active:scale-95"
              >
                <Shield className="w-4 h-4" />
                {isVerifying ? 'Verifying...' : 'Verify Incident'}
              </button>
            )}
            
            {incident.status === 'verified' && (
              <Link href={`/authority/dispatches?incident=${incident._id}`}>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-180 hover:shadow-xs active:scale-95">
                  <Send className="w-4 h-4" />
                  Dispatch Team
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (60%) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Incident Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Incident Details</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{incident.description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Location</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-900 font-medium">{incident.address}</p>
                          <p className="text-slate-600 text-sm">{incident.district}, {incident.state}</p>
                        </div>
                      </div>
                      {incident.location && incident.location.coordinates && (
                        <div className="flex items-center gap-3">
                          <Navigation2 className="w-5 h-5 text-slate-400 shrink-0" />
                          <p className="text-slate-600 text-sm font-mono">
                            {incident.location.coordinates[1].toFixed(5)}, {incident.location.coordinates[0].toFixed(5)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Properties</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-600 text-sm capitalize">Type: <span className="font-medium text-slate-900">{incident.type}</span></span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-600 text-sm">
                          Reported: <span className="font-medium text-slate-900">{incident.createdAt ? format(new Date(incident.createdAt), 'PP p') : 'Unknown'}</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Decision Support & Verification Intelligence Card */}
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-900/50 overflow-hidden text-white">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-800/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-inner">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold tracking-tight text-white">ResQTech Gemini AI</h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                        Decision Support Core
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time disaster triage, fake report forensics & response recommendation</p>
                  </div>
                </div>

                <button
                  onClick={() => triggerAiScan(incident._id)}
                  disabled={isAiScanning}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl transition shadow-md disabled:opacity-50"
                  title="Run real-time AI scan"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-spin' : ''}`} />
                  <span>{isAiScanning ? 'Analyzing...' : 'Re-scan with AI'}</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                {isAiScanning && !incident.aiAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-xs font-semibold tracking-wide">Executing Gemini AI triage & forensic veracity scan...</p>
                  </div>
                ) : incident.aiAnalysis ? (
                  <>
                    {/* 1. Emergency Scope Verdict Banner */}
                    {incident.aiAnalysis.authenticity === 'SUSPICIOUS_OR_PRANK' ? (
                      <div className="p-4 rounded-xl border bg-red-950/40 border-red-800/60 text-red-200 flex items-start gap-3.5 shadow-sm">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-red-300">
                              AI Scope Verdict: Suspected Prank / Fake Submission
                            </span>
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.2 rounded-md font-mono border border-red-500/30">
                              Low Veracity
                            </span>
                          </div>
                          <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                            {incident.aiAnalysis.reasoning || 'Report contains anomalous keywords or informal markers characteristic of a prank. Field verification required before mobilizing emergency units.'}
                          </p>
                        </div>
                      </div>
                    ) : incident.aiAnalysis.isEmergency === false ? (
                      <div className="p-4 rounded-xl border bg-amber-950/40 border-amber-800/60 text-amber-200 flex items-start gap-3.5 shadow-sm">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                              AI Scope Verdict: Routine Civic Maintenance (Non-Emergency)
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.2 rounded-md font-mono border border-amber-500/30">
                              Municipal Scope
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                            {incident.aiAnalysis.emergencyRelevanceReason || 'Standard municipal maintenance issue. Does not require active disaster rescue coordination.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-emerald-950/40 border-emerald-800/60 text-emerald-200 flex items-start gap-3.5 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                              AI Scope Verdict: Genuine Emergency / Disaster Event
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-md font-mono border border-emerald-500/30">
                              Active Triage
                            </span>
                          </div>
                          <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                            {incident.aiAnalysis.emergencyRelevanceReason || 'Verified disaster incident requiring immediate emergency dispatch and inter-agency coordination.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2. Triage Grid (4 Metrics with Icons) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          AI Category
                        </span>
                        <p className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{incident.aiAnalysis.classifiedType || incident.type}</span>
                        </p>
                      </div>

                      <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          AI Severity
                        </span>
                        <span className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-md uppercase ${
                          incident.aiAnalysis.aiSeverity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : incident.aiAnalysis.aiSeverity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : incident.aiAnalysis.aiSeverity === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {incident.aiAnalysis.aiSeverity || incident.severity.toUpperCase()}
                        </span>
                      </div>

                      <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Operational Priority
                        </span>
                        <span className="inline-block text-xs font-extrabold text-indigo-300 font-mono bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                          {incident.aiAnalysis.aiPriority || (incident.severity === 'critical' ? 'P1' : incident.severity === 'high' ? 'P2' : 'P3')}
                        </span>
                      </div>

                      <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Recommended Team
                        </span>
                        <p className="text-xs font-bold text-emerald-300 leading-snug break-words">
                          {incident.aiAnalysis.recommendedTeam || 'Disaster Response Team'}
                        </p>
                      </div>
                    </div>

                    {/* 3. AI Executive Summary for Field Commanders */}
                    {incident.aiAnalysis.aiSummary && (
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/70 space-y-1">
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          <span>AI Executive Summary for Incident Commander</span>
                        </p>
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                          {incident.aiAnalysis.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* 4. Veracity & Forensic Authenticity Breakdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Veracity & Authenticity Verdict
                        </span>
                        {incident.aiAnalysis.authenticity === 'SUSPICIOUS_OR_PRANK' ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide bg-red-500/20 text-red-300 border border-red-500/40 shadow-xs">
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>AI Flagged: Suspicious / Prank Report</span>
                          </span>
                        ) : incident.aiAnalysis.authenticity === 'LIKELY_GENUINE' ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>AI Verified: Genuine Emergency</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>AI Alert: Ground Check Required</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Credibility</p>
                          <p className={`text-base font-extrabold font-mono ${
                            (incident.aiAnalysis.credibilityScore ?? 0) >= 70
                              ? 'text-emerald-400'
                              : (incident.aiAnalysis.credibilityScore ?? 0) >= 40
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {incident.aiAnalysis.credibilityScore ?? 0}%
                          </p>
                        </div>
                        <div className="w-px h-8 bg-slate-700" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Confidence</p>
                          <p className="text-base font-extrabold font-mono text-indigo-400">
                            {incident.aiAnalysis.confidence ?? 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 5. Forensic Reasoning */}
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Forensic AI Reasoning</span>
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {incident.aiAnalysis.reasoning}
                      </p>
                    </div>

                    {/* 6. Operational Directives Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {incident.aiAnalysis.recommendedAction && (
                        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tactical Directive</p>
                          <p className="text-slate-200 font-medium leading-snug">{incident.aiAnalysis.recommendedAction}</p>
                        </div>
                      )}

                      {incident.aiAnalysis.suggestedUnit && (
                        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Designated Response Force</p>
                          <p className="text-indigo-300 font-bold flex items-center gap-1.5 mt-0.5">
                            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{incident.aiAnalysis.suggestedUnit}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-3">
                    <p className="text-xs">No AI assessment has been computed for this incident report.</p>
                    <button
                      onClick={() => triggerAiScan(incident._id)}
                      disabled={isAiScanning}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-md"
                    >
                      ⚡ Run Instant AI Decision Scan
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  Media Evidence
                </h2>
              </div>
              <div className="p-6">
                {incident.mediaUrls && incident.mediaUrls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {incident.mediaUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Evidence ${i+1}`} className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
                    <p>No evidence media uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reporter Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" />
                  Reporter Information
                </h2>
              </div>
              <div className="p-6">
                {reporterInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Name</p>
                      <p className="font-medium text-slate-900">{reporterInfo.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Contact</p>
                      <div className="space-y-1">
                        {reporterInfo.email && (
                          <p className="text-sm text-slate-700 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {reporterInfo.email}
                          </p>
                        )}
                        {reporterInfo.phone && (
                          <p className="text-sm text-slate-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {reporterInfo.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Anonymous or missing reporter information.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (40%) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Status & Assignment Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Status & Assignment</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-slate-600">Current Status</span>
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-slate-600">Priority Score</span>
                  <PriorityBadge score={incident.priorityScore || 0} />
                </div>
                
                {incident.verifiedBy && (
                  <div className="py-2">
                    <p className="text-sm text-slate-500 mb-1">Verified By</p>
                    <p className="font-medium text-slate-900">
                      {typeof incident.verifiedBy === 'object' ? incident.verifiedBy.name : 'Authorized Official'}
                    </p>
                    {incident.verifiedAt && (
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(incident.verifiedAt), 'PP p')}</p>
                    )}
                  </div>
                )}
                
                {incident.assignedTeam && (
                  <div className="py-2">
                    <p className="text-sm text-slate-500 mb-1">Assigned Team</p>
                    <p className="font-medium text-slate-900">
                      {typeof incident.assignedTeam === 'object' ? incident.assignedTeam.name : 'Unknown Team'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card (Fallback if header actions are scrolled past) */}
            {(incident.status === 'reported' || incident.status === 'verified') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-900 mb-4">Required Actions</h3>
                {incident.status === 'reported' && (
                  <button 
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    {isVerifying ? 'Verifying...' : 'Verify Incident'}
                  </button>
                )}
                {incident.status === 'verified' && (
                  <Link href={`/authority/dispatches?incident=${incident._id}`} className="block">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      <Send className="w-4 h-4" />
                      Dispatch Response Team
                    </button>
                  </Link>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Status History</h2>
              </div>
              <div className="p-6">
                <IncidentTimeline history={history} currentStatus={incident.status} />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
