'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import {
  API_ENDPOINTS,
  fetchFromApi,
} from '@/lib/api';

type Incident = {
  _id: string;
  title: string;
  description?: string;

  type:
    | 'flood'
    | 'fire'
    | 'earthquake'
    | 'landslide'
    | 'cyclone'
    | 'other';

  severity:
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';

  status:
    | 'reported'
    | 'verified'
    | 'assigned'
    | 'in_progress'
    | 'resolved'
    | 'closed';

  isSOS?: boolean;

  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  address?: string;
  state: string;
  district: string;

  priorityScore?: number;
};

type IncidentResponse = {
  success: boolean;
  count: number;
  data: Incident[];
  message?: string;
};

const center: [number, number] = [22.9734, 78.6569];

const severityStyles = {
  critical: {
    color: '#dc2626',
    label: 'CRITICAL',
  },
  high: {
    color: '#f97316',
    label: 'HIGH',
  },
  medium: {
    color: '#eab308',
    label: 'MEDIUM',
  },
  low: {
    color: '#22c55e',
    label: 'LOW',
  },
};

const createSeverityIcon = (
  severity: Incident['severity']
) => {
  const { color } = severityStyles[severity];

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow:
          0 0 0 4px ${color}33,
          0 4px 10px rgba(15,23,42,0.25);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

export default function LiveDisasterMapClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        setLoading(true);

        const activeStatuses = [
          'reported',
          'verified',
          'assigned',
          'in_progress',
        ];

        const responses = await Promise.all(
          activeStatuses.map((status) =>
            fetchFromApi<IncidentResponse>(
                `${API_ENDPOINTS.INCIDENTS_PUBLIC}?status=${status}`
              )
          )
        );

        const activeIncidents = responses.flatMap((response) =>
          Array.isArray(response.data)
            ? response.data
            : []
        );

        const uniqueIncidents = Array.from(
          new Map(
            activeIncidents.map((incident) => [
              incident._id,
              incident,
            ])
          ).values()
        );

        setIncidents(uniqueIncidents);

        console.log(
          '📍 Active incidents:',
          uniqueIncidents
        );
      } catch (error) {
        console.error(
          '❌ Failed to load active incidents:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, []);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-2xl">

      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {incidents.map((incident) => {
          const coordinates =
            incident.location?.coordinates;

          if (
            !coordinates ||
            coordinates.length !== 2 ||
            !Number.isFinite(coordinates[0]) ||
            !Number.isFinite(coordinates[1])
          ) {
            return null;
          }

          const [longitude, latitude] = coordinates;

          const severity =
            severityStyles[incident.severity];

          return (
            <Marker
              key={incident._id}
              position={[latitude, longitude]}
              icon={createSeverityIcon(
                incident.severity
              )}
            >
              <Popup>
                <div className="min-w-[190px] space-y-2">

                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      {incident.title}
                    </h3>

                    {incident.isSOS && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                        SOS
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    {incident.district}, {incident.state}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium capitalize text-slate-700">
                      {incident.type}
                    </span>

                    <span
                      className="rounded-md px-2 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor:
                          `${severity.color}20`,
                        color: severity.color,
                      }}
                    >
                      {severity.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    Status:{' '}
                    <span className="font-semibold capitalize">
                      {incident.status.replace(
                        '_',
                        ' '
                      )}
                    </span>
                  </div>

                  {incident.priorityScore !== undefined && (
                    <div className="text-xs text-slate-600">
                      Priority Score:{' '}
                      <span className="font-bold">
                        {incident.priorityScore}
                      </span>
                    </div>
                  )}

                  {incident.address && (
                    <div className="text-xs text-slate-500">
                      {incident.address}
                    </div>
                  )}

                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Active incidents */}
      <div className="absolute right-3 top-3 z-[1000] rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md backdrop-blur-md">
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

        {loading
          ? 'Loading active incidents...'
          : `${incidents.length} active incident${
              incidents.length === 1 ? '' : 's'
            }`}
      </div>

      {/* Severity legend */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-600">

          {Object.entries(severityStyles).map(
            ([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-1.5"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: value.color,
                  }}
                />

                <span className="capitalize">
                  {key}
                </span>
              </div>
            )
          )}

        </div>
      </div>

    </div>
  );
}