'use client';

import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

// ─── Loading State ───

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Error State ───

export function ErrorState({
  title,
  message = 'Something went wrong',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="p-3 rounded-full bg-red-50 text-red-500 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      {title && <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>}
      <p className="text-sm font-medium text-slate-600 text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Empty State ───

export function EmptyState({
  icon: IconOrElement = Inbox,
  title = 'No data',
  description,
  message,
  action,
}: {
  icon?: any;
  title?: string;
  description?: string;
  message?: string;
  action?: React.ReactNode | { label: string; onClick: () => void };
}) {
  const text = message || description || 'There is nothing to display at the moment.';

  const renderIcon = () => {
    if (!IconOrElement) return null;
    if (React.isValidElement(IconOrElement)) {
      return IconOrElement;
    }
    const IconComp = IconOrElement as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-6 h-6" />;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
        {renderIcon()}
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">{text}</p>
      {action && (
        <div className="mt-4">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === 'object' && 'label' in action && 'onClick' in action ? (
            <button
              onClick={(action as any).onClick}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {(action as any).label}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Section Loading Skeleton ───

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        <div className="w-12 h-5 bg-slate-100 rounded-full" />
      </div>
      <div className="mt-3">
        <div className="w-16 h-7 bg-slate-100 rounded-md" />
        <div className="w-24 h-4 bg-slate-50 rounded mt-2" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-slate-100">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 rounded flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-slate-50 flex gap-4">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
