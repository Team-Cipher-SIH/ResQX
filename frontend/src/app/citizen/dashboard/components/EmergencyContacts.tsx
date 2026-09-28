'use client';

import { Phone, Shield, Flame, HeartPulse, HelpCircle, Siren } from 'lucide-react';

const EMERGENCY_HELPLINES = [
  { name: 'National Emergency Number', number: '112', icon: Siren, color: 'text-red-600 bg-red-50 border-red-200' },
  { name: 'NDRF Disaster Helpline', number: '1078', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { name: 'Police Assistance', number: '100', icon: Siren, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { name: 'Fire Control Command', number: '101', icon: Flame, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { name: 'Ambulance & Medical', number: '108 / 102', icon: HeartPulse, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { name: 'Women & Child Helpline', number: '1090 / 1098', icon: HelpCircle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

export default function EmergencyContacts() {
  return (
    <section id="emergency-contacts" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
          Instant Dispatch Hotlines
        </span>
        <h3 className="mt-1 text-2xl font-black text-slate-900">
          Emergency Helplines & Contacts
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Direct toll-free access to national and state rescue departments.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EMERGENCY_HELPLINES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between p-4 rounded-2xl border ${item.color} transition hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white shadow-xs">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                  <a
                    href={`tel:${item.number.split(' ')[0]}`}
                    className="text-base font-extrabold text-slate-900 tracking-tight hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {item.number}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
