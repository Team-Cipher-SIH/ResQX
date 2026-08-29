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
import { ArrowLeft, MapPin, Clock, User, Shield, AlertTriangle, Image as ImageIcon, Send, Phone, Mail, Navigation2 } from 'lucide-react';
import { format } from 'date-fns';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchIncidentDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFromApi<Incident>(API_ENDPOINTS.INCIDENT_DETAIL(id));
      if (res.success && res.data) {
        setIncident(res.data);
      } else {
        setError(res.message || 'Failed to fetch incident details');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching incident details');
    } finally {
      setLoading(false);
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
