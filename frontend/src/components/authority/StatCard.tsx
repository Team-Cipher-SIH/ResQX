'use client';

import { ReactNode } from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CountUpNumber from '@/components/ui/CountUpNumber';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'red' | 'emerald' | 'orange' | 'purple' | 'slate';
  children?: ReactNode;
}

const colorMap = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100/80 group-hover:border-blue-200',
    value: 'text-slate-900',
    border: 'hover:border-blue-300 hover:shadow-blue-500/5',
    accent: 'bg-blue-500',
  },
  red: {
    icon: 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-100/80 group-hover:border-red-200',
    value: 'text-red-700',
    border: 'hover:border-red-300 hover:shadow-red-500/5',
    accent: 'bg-red-500',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100/80 group-hover:border-emerald-200',
    value: 'text-emerald-700',
    border: 'hover:border-emerald-300 hover:shadow-emerald-500/5',
    accent: 'bg-emerald-500',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-100/80 group-hover:border-orange-200',
    value: 'text-orange-700',
    border: 'hover:border-orange-300 hover:shadow-orange-500/5',
    accent: 'bg-orange-500',
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-100/80 group-hover:border-purple-200',
    value: 'text-purple-700',
    border: 'hover:border-purple-300 hover:shadow-purple-500/5',
    accent: 'bg-purple-500',
  },
  slate: {
    icon: 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-slate-100 group-hover:border-slate-300',
    value: 'text-slate-900',
    border: 'hover:border-slate-300 hover:shadow-slate-500/5',
    accent: 'bg-slate-500',
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
  color = 'blue',
  children,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colors.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2.5 rounded-xl border transition-all duration-200 shadow-2xs ${colors.icon}`}>
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full transition-transform duration-200 ${
              trendDirection === 'up'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                : trendDirection === 'down'
                ? 'text-red-700 bg-red-50 border border-red-200/80'
                : 'text-slate-600 bg-slate-50 border border-slate-200'
            }`}
          >
            {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>

      <div className="mt-3.5">
        <p className={`text-2xl font-black tracking-tight font-mono ${colors.value}`}>
          <CountUpNumber value={value} />
        </p>
        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
      </div>

      {children && <div className="mt-3.5 pt-3 border-t border-slate-100">{children}</div>}
    </div>
  );
}
