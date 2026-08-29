'use client';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const locationIcon = new L.Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LocationMap({
  latitude,
  longitude,
  accuracy,
}: LocationMapProps) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={true}
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[latitude, longitude]}
          icon={locationIcon}
        >
          <Popup>
            <div>
              <p className="font-semibold">
                Your Location
              </p>

              <p>
                Latitude: {latitude.toFixed(6)}
              </p>

              <p>
                Longitude: {longitude.toFixed(6)}
              </p>

              {accuracy !== undefined && (
                <p>
                  Accuracy: ±{Math.round(accuracy)} m
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}