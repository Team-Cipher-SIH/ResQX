'use client';

import dynamic from 'next/dynamic';

const LiveDisasterMapClient = dynamic(
  () => import('./LiveDisasterMapClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl bg-slate-100">
        <span className="text-sm text-slate-500">
          Loading live map...
        </span>
      </div>
    ),
  }
);

export default function LiveDisasterMap() {
  return <LiveDisasterMapClient />;
}