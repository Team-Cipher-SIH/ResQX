'use client';

import { AlertTriangle, MapPin, Siren, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import PulsingDot from '@/components/ui/PulsingDot';
import { useEmergencySOS } from '@/lib/useEmergencySOS';

interface QuickActionsProps {
  onToggleReliefCamps?: () => void;
  onSOSSuccess?: () => void;
}

export default function QuickActions({ onToggleReliefCamps, onSOSSuccess }: QuickActionsProps) {
  const { isSendingSOS, sosStatus, triggerSOS, dismissStatus } = useEmergencySOS({
    onSuccess: onSOSSuccess,
  });

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
        <p className="text-sm text-slate-500">
          Immediate access to essential emergency and disaster services.
        </p>
      </div>

      {sosStatus && (
        <div
          className={`mb-4 flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-medium animate-fade-in ${
            sosStatus.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {sosStatus.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <div className="flex-1 font-medium">{sosStatus.message}</div>
          <button
            type="button"
            onClick={dismissStatus}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Report Incident */}
        <button
          type="button"
          onClick={() => {
            document.getElementById('report-incident')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group rounded-2xl border border-red-200/80 bg-red-50/50 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-red-300 active:scale-[0.99]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 transition-transform duration-200 group-hover:scale-105">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h4 className="font-bold text-slate-900">Report an Incident</h4>

          <p className="mt-2 text-sm leading-5 text-slate-600">
            Report a disaster or emergency with location and severity details.
          </p>

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition-transform duration-200 group-hover:translate-x-0.5">
            Report now <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        {/* SOS Alert */}
        <button
          type="button"
          disabled={isSendingSOS}
          onClick={triggerSOS}
          className="group relative rounded-2xl border border-orange-200/90 bg-orange-50/60 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-orange-300 active:scale-[0.99] disabled:opacity-60 overflow-hidden"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-transform duration-200 group-hover:scale-105 shadow-xs">
              {isSendingSOS ? (
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              ) : (
                <Siren className="h-6 w-6" />
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
              <PulsingDot variant="critical" size="sm" />
              Emergency
            </span>
          </div>

          <h4 className="font-bold text-slate-900">
            {isSendingSOS ? 'Broadcasting SOS...' : 'Emergency SOS'}
          </h4>

          <p className="mt-2 text-sm leading-5 text-slate-600">
            Send an emergency alert with your current location in a single tap.
          </p>

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition-transform duration-200 group-hover:translate-x-0.5">
            {isSendingSOS ? 'Locating & Dispatching...' : 'Send SOS'} <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        {/* Relief Camps */}
        <button
          type="button"
          onClick={() => {
            if (onToggleReliefCamps) {
              onToggleReliefCamps();
            }
            setTimeout(() => {
              document.getElementById('relief-camps')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          className="group rounded-2xl border border-blue-200/80 bg-blue-50/50 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 active:scale-[0.99]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-transform duration-200 group-hover:scale-105">
            <MapPin className="h-6 w-6" />
          </div>

          <h4 className="font-bold text-slate-900">Find Relief Camps</h4>

          <p className="mt-2 text-sm leading-5 text-slate-600">
            Find nearby shelters and relief camps based on your location.
          </p>

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-transform duration-200 group-hover:translate-x-0.5">
            Find nearby <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </section>
  );
}