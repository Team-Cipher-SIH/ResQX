'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  MapPin,
  Home,
  Navigation,
  Search,
  Crosshair,
  Radio,
  Clock,
  Shield,
  ArrowRight,
  X,
  Compass,
} from 'lucide-react';
import {
  CITIZEN_MOCK_INCIDENTS,
  CITIZEN_MOCK_SHELTERS,
  CITIZEN_MOCK_ALERTS,
  type CitizenIncident,
  type CitizenShelter,
  type CitizenAlert,
} from '@/data/citizenMapMockData';
import type { CitizenMapProps } from './CitizenMap';
import PulsingDot from '@/components/ui/PulsingDot';

// ─── Default Citizen Center (Pune) ───
const DEFAULT_CENTER: [number, number] = [18.5204, 73.8567];
const DEFAULT_ZOOM = 13;

// ─── Custom DivIcons ───
const createCitizenIncidentIcon = (severity: string, isCritical: boolean, isSOS?: boolean) => {
  const color =
    severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : severity === 'medium' ? '#ca8a04' : '#2563eb';

  return L.divIcon({
    className: 'custom-citizen-incident-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
        ${
          isCritical || isSOS
            ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.3);
          color: white;
          font-weight: 800;
          font-size: 10px;
        ">
          ${isSOS ? '!' : severity.charAt(0).toUpperCase()}
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const createCitizenShelterIcon = () => {
  return L.divIcon({
    className: 'custom-citizen-shelter-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #0284c7;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.25);
        color: white;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-location-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: #3b82f6; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          box-shadow: 0 0 0 2px #3b82f6, 0 3px 8px rgba(15, 23, 42, 0.35);
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// ─── Smooth Map Controller ───
function MapController({
  targetCenter,
  targetZoom,
}: {
  targetCenter: [number, number];
  targetZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(targetCenter, targetZoom, { duration: 1 });
  }, [map, targetCenter, targetZoom]);

  return null;
}

export default function CitizenMapClient({
  incidents: propIncidents,
  shelters: propShelters,
  alerts: propAlerts,
  height = '460px',
  className = '',
}: CitizenMapProps) {
  const incidents = useMemo(() => propIncidents || CITIZEN_MOCK_INCIDENTS, [propIncidents]);
  const shelters = useMemo(() => propShelters || CITIZEN_MOCK_SHELTERS, [propShelters]);
  const alerts = useMemo(() => propAlerts || CITIZEN_MOCK_ALERTS, [propAlerts]);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'incidents' | 'shelters' | 'critical'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Selected item state (compact panel)
  const [selectedIncident, setSelectedIncident] = useState<CitizenIncident | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<CitizenShelter | null>(null);

  // Locate User
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setMapZoom(14);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation warning:', error.message);
        // Fallback to default smoothly without breaking
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    if (activeCategory === 'shelters') return [];

    let list = incidents;

    if (activeCategory === 'critical') {
      list = list.filter((i) => i.severity === 'critical' || i.isSOS);
    }

    if (severityFilter !== 'all') {
      list = list.filter((i) => i.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q) ||
          i.district?.toLowerCase().includes(q) ||
          i.address?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [incidents, activeCategory, severityFilter, searchQuery]);

  // Filtered Shelters
  const filteredShelters = useMemo(() => {
    if (activeCategory === 'incidents' || activeCategory === 'critical') return [];

    let list = shelters;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.district?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [shelters, activeCategory, searchQuery]);

  const activeAlert = alerts && alerts.length > 0 ? alerts[0] : null;

  return (
    <section className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>
      {/* ─── Section Header ─── */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              Community Safety Radar
            </span>
            <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold border border-blue-200">
              Live Geo-Tracking
            </span>
          </div>
          <h3 className="mt-0.5 text-xl font-black text-slate-900">
            Nearby Disasters & Safe Shelters
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Live community hazards, distance markers, and certified municipal evacuation shelters in your vicinity.
          </p>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 shadow-2xs"
        >
          <Crosshair className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? 'Detecting GPS...' : 'My Location'}
        </button>
      </div>

      {/* ─── Search & Category Filter Controls ─── */}
      <div className="mb-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident, disaster type, or shelter name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSeverityFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('incidents')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'incidents'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Incidents ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('shelters')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'shelters'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Shelters ({shelters.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('critical');
              setSeverityFilter('critical');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'critical'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            Critical
          </button>
        </div>
      </div>

      {/* ─── Active Emergency Advice Banner (if critical alert) ─── */}
      {activeAlert && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-900 animate-fade-in">
          <Radio className="w-4 h-4 text-red-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <p className="font-bold">{activeAlert.title}</p>
            <p className="text-[11px] text-red-700 mt-0.5">
              ⚠️ <b>Avoid Area:</b> {activeAlert.avoidArea} • <b>Nearest Safe Haven:</b> {activeAlert.nearestShelter}
            </p>
          </div>
        </div>
      )}

      {/* ─── Map Container ─── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          <MapController targetCenter={mapCenter} targetZoom={mapZoom} />

          {/* ─── User Location Marker ─── */}
          {userLocation && (
            <Marker position={userLocation} icon={createUserLocationIcon()}>
              <Popup className="custom-resqtech-popup" closeButton={false}>
                <div className="p-2 text-center text-xs">
                  <p className="font-bold text-blue-700">📍 You are here</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">GPS location active</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ─── Incident Markers ─── */}
          {filteredIncidents.map((incident) => {
            const coords = incident.location?.coordinates;
            if (!coords || coords.length !== 2 || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
              return null;
            }
            const [lng, lat] = coords;
            const isCritical = incident.severity === 'critical';

            return (
              <Marker
                key={`cit-inc-${incident._id}`}
                position={[lat, lng]}
                icon={createCitizenIncidentIcon(incident.severity, isCritical, incident.isSOS)}
                eventHandlers={{
                  click: () => {
                    setSelectedIncident(incident);
                    setSelectedShelter(null);
                  },
                }}
              >
                <Popup className="custom-resqtech-popup" closeButton={false}>
                  <div className="min-w-[210px] max-w-[250px] p-2.5 text-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          incident.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : incident.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : incident.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {incident.severity}
                      </span>
                      {incident.distance && (
                        <span className="text-[10px] font-bold text-blue-600">
                          {incident.distance} away
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{incident.title}</h4>

                    <p className="text-[11px] text-slate-500 line-clamp-2">{incident.description}</p>

                    <div className="text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <p>📍 {incident.address || `${incident.district}, ${incident.state}`}</p>
                      <p className="flex justify-between">
                        <span>Status: <b className="capitalize text-slate-700">{incident.status}</b></span>
                        <span className="text-slate-400 capitalize">{incident.type}</span>
                      </p>
                    </div>

                    <div className="pt-1">
                      <a
                        href="#my-incidents"
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                      >
                        {incident.isOwner ? 'View My Report' : 'View Incident Details'}
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ─── Shelter Markers ─── */}
          {filteredShelters.map((shelter) => {
            const coords = shelter.location?.coordinates;
            if (!coords || coords.length !== 2 || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
              return null;
            }
            const [lng, lat] = coords;
            const occ = shelter.currentOccupancy !== undefined ? shelter.currentOccupancy : (shelter.occupancy || 0);
            const available = Math.max(0, shelter.capacity - occ);

            return (
              <Marker
                key={`cit-sh-${shelter._id}`}
                position={[lat, lng]}
                icon={createCitizenShelterIcon()}
                eventHandlers={{
                  click: () => {
                    setSelectedShelter(shelter);
                    setSelectedIncident(null);
                  },
                }}
              >
                <Popup className="custom-resqtech-popup" closeButton={false}>
                  <div className="min-w-[210px] max-w-[250px] p-2.5 text-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                        Safe Haven / Shelter
                      </span>
                      {shelter.distance && (
                        <span className="text-[10px] font-bold text-sky-700">{shelter.distance}</span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{shelter.name}</h4>
                    <p className="text-[10px] text-slate-500">📍 {shelter.address}</p>

                    <div className="text-[10px] text-slate-600 bg-sky-50/60 p-2 rounded-lg border border-sky-100 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Capacity:</span>
                        <b>{shelter.capacity}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Occupied:</span>
                        <b>{shelter.occupancy}</b>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Available Slots:</span>
                        <span>{available}</span>
                      </div>
                    </div>

                    {/* Public Relief Supply Status */}
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                        Relief Essentials
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[9px] font-semibold text-slate-700">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="text-[10px]">✓</span> Water Available
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="text-[10px]">✓</span> Food Available
                        </span>
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="text-[10px]">!</span> Medicine Limited
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="text-[10px]">✓</span> Blankets Available
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <a
                        href={`https://maps.google.com/?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        Get Directions
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* ─── Top-Right Telemetry Badge ─── */}
        <div className="absolute right-3 top-3 z-[1000] hidden sm:flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-md backdrop-blur-md">
          <PulsingDot variant="live" size="sm" />
          <span>{filteredIncidents.length} Hazards • {filteredShelters.length} Shelters</span>
        </div>

        {/* ─── Bottom-Left Minimal Citizen Legend ─── */}
        <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-bold text-slate-600">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-600" />
              <span>Shelter</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600 ring-1 ring-blue-300" />
                <span>You</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Selected Detail Mini-Panel (if marker clicked) ─── */}
      {selectedIncident && (
        <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center animate-fade-in">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                selectedIncident.severity === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : selectedIncident.severity === 'high'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-slate-900">{selectedIncident.title}</h4>
                {selectedIncident.distance && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {selectedIncident.distance} away
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{selectedIncident.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedIncident(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <a
              href="#my-incidents"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              View Report <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {selectedShelter && (
        <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-3.5 sm:flex-row sm:items-center animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-slate-900">{selectedShelter.name}</h4>
                {selectedShelter.distance && (
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                    {selectedShelter.distance} away
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Available slots: <b>{Math.max(0, selectedShelter.capacity - (selectedShelter.currentOccupancy !== undefined ? selectedShelter.currentOccupancy : (selectedShelter.occupancy || 0)))}</b> of {selectedShelter.capacity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedShelter(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <a
              href={`https://maps.google.com/?q=${selectedShelter.location.coordinates[1]},${selectedShelter.location.coordinates[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Get Directions
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
