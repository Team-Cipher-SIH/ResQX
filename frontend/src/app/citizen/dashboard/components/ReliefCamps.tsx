'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi } from '@/lib/api';
import { MapPin, Phone, Users, Shield, RefreshCw, AlertCircle, Navigation } from 'lucide-react';

export interface ShelterItem {
  _id: string;
  name: string;
  address: string;
  state: string;
  district: string;
  capacity: number;
  currentOccupancy: number;
  contactNumber: string | null;
  isActive: boolean;
  location?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function ReliefCamps() {
  const [shelters, setShelters] = useState<ShelterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [usingCoordinates, setUsingCoordinates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fallbackToAllShelters() {
      try {
        if (isMounted) setUsingCoordinates(false);
        const res = await fetchFromApi<ShelterItem[]>('/shelters');
        if (isMounted) {
          if (res.success && Array.isArray(res.data)) {
            setShelters(res.data);
            setError(null);
          } else {
            setError(res.message || res.error || 'Failed to retrieve active shelters');
          }
        }
      } catch (err) {
        console.error('Shelters fallback error:', err);
        if (isMounted) setError('Unable to reach shelters endpoint');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function loadShelters() {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        if (isMounted) setIsGeolocating(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (isMounted) setIsGeolocating(false);
            const { longitude, latitude } = position.coords;
            try {
              const res = await fetchFromApi<ShelterItem[]>(
                `/shelters/nearby?lng=${longitude}&lat=${latitude}&maxDistance=50000`
              );
              if (isMounted) {
                if (res.success && Array.isArray(res.data)) {
                  setShelters(res.data);
                  setUsingCoordinates(true);
                  setError(null);
                  setIsLoading(false);
                } else {
                  fallbackToAllShelters();
                }
              }
            } catch {
              if (isMounted) fallbackToAllShelters();
            }
          },
          () => {
            if (isMounted) {
              setIsGeolocating(false);
              fallbackToAllShelters();
            }
          },
          { timeout: 8000, enableHighAccuracy: true }
        );
      } else {
        fallbackToAllShelters();
      }
    }

    loadShelters();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <section id="relief-camps" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              Safe Havens & Resources
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              <Navigation className="h-3 w-3" />
              {usingCoordinates ? 'Sorted by proximity' : 'General Directory'}
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            Relief Camps & Emergency Shelters
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Active verified government and humanitarian safe shelters near you.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoading || isGeolocating}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isGeolocating ? 'animate-spin' : ''}`} />
          {isGeolocating ? 'Detecting GPS...' : 'Refresh Shelters'}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-400">
          <RefreshCw className="mb-2 h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm">Scanning for active disaster relief camps...</p>
        </div>
      ) : shelters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
          <Shield className="mb-2 h-8 w-8 text-slate-300" />
          <h4 className="font-bold text-slate-700">No active shelters found in this range</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Authorities have not listed open camps in this zone or emergency services are currently mobilizing.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shelters.map((shelter) => {
            const occupancyPct =
              shelter.capacity > 0
                ? Math.min(100, Math.round((shelter.currentOccupancy / shelter.capacity) * 100))
                : 0;

            const isFull = occupancyPct >= 95;

            return (
              <div
                key={shelter._id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{shelter.name}</h4>
                      <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {shelter.address}, {shelter.district}, {shelter.state}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isFull
                          ? 'border-red-200 bg-red-100 text-red-700'
                          : 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isFull ? 'Near Capacity' : 'Available'}
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Occupancy
                      </span>
                      <span className="font-bold text-slate-800">
                        {shelter.currentOccupancy} / {shelter.capacity} ({occupancyPct}%)
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-red-500'
                            : occupancyPct > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Public Relief Supply Availability */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Relief Resource Availability
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
                      <div className="p-1 rounded-lg bg-blue-50/80 border border-blue-100 text-blue-800">
                        <span className="block font-bold text-[9px] uppercase">Water</span>
                        <span className="text-[10px] font-bold text-emerald-700">&bull; Available</span>
                      </div>
                      <div className="p-1 rounded-lg bg-amber-50/80 border border-amber-100 text-amber-800">
                        <span className="block font-bold text-[9px] uppercase">Food</span>
                        <span className="text-[10px] font-bold text-emerald-700">&bull; Available</span>
                      </div>
                      <div className="p-1 rounded-lg bg-red-50/80 border border-red-100 text-red-800">
                        <span className="block font-bold text-[9px] uppercase">Medical</span>
                        <span className="text-[10px] font-bold text-amber-700">&bull; Limited</span>
                      </div>
                      <div className="p-1 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-800">
                        <span className="block font-bold text-[9px] uppercase">Blankets</span>
                        <span className="text-[10px] font-bold text-emerald-700">&bull; Available</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  {shelter.contactNumber ? (
                    <a
                      href={`tel:${shelter.contactNumber}`}
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {shelter.contactNumber}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No phone hotline provided</span>
                  )}

                  {shelter.location?.coordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${shelter.location.coordinates[1]},${shelter.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold inline-flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Get Directions
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
