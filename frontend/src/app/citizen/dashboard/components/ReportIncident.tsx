'use client';

import { useState, useMemo } from 'react';
import { Camera, MapPin, AlertCircle, CheckCircle2, Loader2, UploadCloud, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { fetchFromApi } from '@/lib/api';
import { INDIA_STATES } from '@/data/indiaStatesDistricts';

import { incidentSchema, IncidentFormData } from '@/lib/validations/incident';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="mt-4 flex h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
      Loading map coordinates...
    </div>
  ),
});

interface ReportIncidentProps {
  onIncidentReported?: () => void;
}

export default function ReportIncident({ onIncidentReported }: ReportIncidentProps) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'flood',
      severity: 'low',
      state: '',
      district: '',
    },
  });

  const selectedState = watch('state');

  const availableDistricts = useMemo(() => {
    if (!selectedState) return [];
    const found = INDIA_STATES.find(
      (s) => s.name.toLowerCase() === selectedState.toLowerCase()
    );
    return found ? found.districts : [];
  }, [selectedState]);

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy <= 30) {
      return {
        label: 'High accuracy',
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (accuracy <= 100) {
      return {
        label: 'Moderate accuracy',
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }
    return {
      label: 'Low accuracy',
      className: 'text-red-700 bg-red-50 border-red-200',
    };
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          longitude,
          latitude,
          accuracy,
        });
      },
      (error) => {
        console.error(error);
        alert('Could not detect location: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const onSubmit = async (data: IncidentFormData) => {
    if (!location) {
      setSubmitError('Please detect your GPS location before submitting the emergency report.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('type', data.type);
      formData.append('severity', data.severity || 'medium');
      formData.append('coordinates', JSON.stringify([location.longitude, location.latitude]));
      formData.append('state', data.state);
      formData.append('district', data.district);

      if (photo) {
        formData.append('photo', photo);
      }

      const response = await fetchFromApi('/incidents/report', {
        method: 'POST',
        body: formData,
      });

      if (!response.success) {
        setSubmitError(response.message || response.error || 'Failed to report incident');
        return;
      }

      setSubmitSuccess('Incident reported successfully! Authorities and nearby response units have been notified.');
      reset();
      setPhoto(null);
      setPhotoPreview(null);
      if (onIncidentReported) {
        onIncidentReported();
      }
    } catch (err) {
      console.error('Error reporting incident:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="report-incident"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
          Emergency Reporting
        </p>

        <h3 className="mt-1 text-2xl font-black text-slate-900">
          Report an Incident
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Provide situational details below so district authorities can verify, prioritize, and dispatch response teams.
        </p>
      </div>

      {submitSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Incident Title
          </label>

          <input
            type="text"
            placeholder="e.g. Severe waterlogging near Central Bridge"
            {...register('title')}
            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
              errors.title
                ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
            }`}
          />

          {errors.title && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Description & Ground Situation
          </label>

          <textarea
            rows={4}
            placeholder="Describe what is happening, immediate hazards, trapped civilians, or assistance needed..."
            {...register('description')}
            className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
              errors.description
                ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
            }`}
          />

          {errors.description && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.description.message}</p>
          )}
        </div>

        {/* State & District Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* State Select */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              State / Union Territory <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <select
                {...register('state', {
                  onChange: () => setValue('district', ''),
                })}
                className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 font-medium ${
                  errors.state
                    ? 'border-red-400 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100 text-slate-800'
                }`}
              >
                <option value="">Select State</option>
                {INDIA_STATES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {errors.state && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.state.message}</p>
            )}
          </div>

          {/* District Select */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              District / Command Region <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <select
                {...register('district')}
                disabled={!selectedState}
                className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 font-medium ${
                  !selectedState
                    ? 'border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed'
                    : errors.district
                    ? 'border-red-400 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100 text-slate-800'
                }`}
              >
                <option value="">{selectedState ? 'Select District' : 'Select State First'}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {errors.district && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.district.message}</p>
            )}
          </div>
        </div>

        {/* Type + Severity Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Disaster Type */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Disaster Category
            </label>

            <select
              {...register('type')}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 cursor-pointer ${
                errors.type
                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
              }`}
            >
              <option value="flood">Flood / Waterlogging</option>
              <option value="earthquake">Earthquake</option>
              <option value="fire">Fire Outbreak</option>
              <option value="cyclone">Cyclone / Storm</option>
              <option value="landslide">Landslide</option>
              <option value="other">Other Emergency</option>
            </select>

            {errors.type && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.type.message}</p>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Reported Severity Level
            </label>

            <select
              {...register('severity')}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 cursor-pointer ${
                errors.severity
                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
              }`}
            >
              <option value="low">Low (Minor disruption)</option>
              <option value="medium">Medium (Moderate impact)</option>
              <option value="high">High (Immediate danger to property/life)</option>
            </select>

            {errors.severity && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.severity.message}</p>
            )}
          </div>
        </div>

        {/* Photo Upload Area */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Photo Evidence (Optional)
          </label>

          <label className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-xs border border-slate-200/80 transition-transform duration-200 group-hover:scale-105">
              <UploadCloud className="h-5 w-5 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {photo ? photo.name : 'Choose an image file or drop here'}
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, or WebP format</p>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhoto(file);
                setPhotoPreview(URL.createObjectURL(file));
              }}
            />
          </label>

          {photoPreview && (
            <div className="mt-3 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 max-h-48 w-full max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Preview" className="h-48 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Location Detection */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              GPS Location Coordinates
            </label>

            <button
              type="button"
              onClick={detectLocation}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              Auto-detect GPS Location
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            {location ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-4">
                  <p>
                    <span className="font-semibold text-slate-800">Latitude:</span>{' '}
                    {location.latitude.toFixed(6)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Longitude:</span>{' '}
                    {location.longitude.toFixed(6)}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-500">Accuracy: ±{Math.round(location.accuracy)}m</span>
                  {(() => {
                    const status = getAccuracyStatus(location.accuracy);
                    return (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>Click &quot;Auto-detect GPS Location&quot; above to link coordinates to this report.</span>
              </div>
            )}
          </div>

          {location && (
            <div className="mt-3">
              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
                accuracy={location.accuracy}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Submitting Incident Report...
            </>
          ) : (
            'Submit Emergency Incident Report'
          )}
        </button>
      </form>
    </section>
  );
}