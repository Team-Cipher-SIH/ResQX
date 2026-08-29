'use client';

import { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import QuickActions from './components/QuickActions';
import IncidentSummary from './components/IncidentSummary';
import EmergencyAlerts from './components/EmergencyAlerts';
import CitizenMap from '@/components/citizen/CitizenMap';
import ReportIncident from './components/ReportIncident';
import MyIncidents, { IncidentItem } from './components/MyIncidents';
import ReliefCamps from './components/ReliefCamps';
import CommunityHelp from './components/CommunityHelp';
import EmergencyContacts from './components/EmergencyContacts';
import ProfileCard from './components/ProfileCard';

export default function CitizenDashboard() {
  const [incidentsList, setIncidentsList] = useState<IncidentItem[]>([]);
  const [incidentRefreshKey, setIncidentRefreshKey] = useState(0);
  const [showReliefCamps, setShowReliefCamps] = useState(true);

  const handleIncidentReported = () => {
    setIncidentRefreshKey((prev) => prev + 1);
  };

  const handleToggleReliefCamps = () => {
    setShowReliefCamps(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* 1. Header with Identity & Logout */}
      <DashboardHeader />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Welcome Section */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">
            CITIZEN RESPONSE PORTAL
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Civic Emergency & Disaster Hub
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Report local incidents, broadcast emergency SOS signals, track relief status,
            and connect with mutual aid networks across your district.
          </p>
        </section>

        {/* 2. Quick Actions */}
        <QuickActions
          onToggleReliefCamps={handleToggleReliefCamps}
          onSOSSuccess={handleIncidentReported}
        />

        {/* 3. Live Incident Triage Summary Counters */}
        <IncidentSummary incidents={incidentsList} refreshKey={incidentRefreshKey} />

        {/* 4. Live Emergency Warnings & Broadcasts */}
        <EmergencyAlerts />

        {/* 5. Citizen Interactive Safety & Disaster Map */}
        <CitizenMap />

        {/* 6. Incident Reporting Form */}
        <ReportIncident onIncidentReported={handleIncidentReported} />

        {/* 7. My Submitted Incidents & Live Tracking */}
        <MyIncidents
          refreshKey={incidentRefreshKey}
          onDataLoaded={setIncidentsList}
        />

        {/* 8. Relief Camps & Shelters */}
        {showReliefCamps && <ReliefCamps />}

        {/* 9. Community Aid & Help Board */}
        <CommunityHelp />

        {/* 10. Instant Dispatch Helplines */}
        <EmergencyContacts />

        {/* 11. Citizen Profile Management */}
        <ProfileCard />
      </div>
    </main>
  );
}