'use client';

interface PulsingDotProps {
  variant?: 'live' | 'critical' | 'warning' | 'busy' | 'offline' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PulsingDot({
  variant = 'live',
  size = 'md',
  className = '',
}: PulsingDotProps) {
  const sizeMap = {
    sm: { container: 'h-2 w-2', dot: 'h-2 w-2' },
    md: { container: 'h-2.5 w-2.5', dot: 'h-2.5 w-2.5' },
    lg: { container: 'h-3 w-3', dot: 'h-3 w-3' },
  };

  const variantMap = {
    live: {
      ping: 'bg-emerald-400',
      dot: 'bg-emerald-500',
    },
    critical: {
      ping: 'bg-red-400',
      dot: 'bg-red-500',
    },
    warning: {
      ping: 'bg-amber-400',
      dot: 'bg-amber-500',
    },
    busy: {
      ping: 'bg-orange-400',
      dot: 'bg-orange-500',
    },
    offline: {
      ping: '',
      dot: 'bg-slate-400',
    },
    blue: {
      ping: 'bg-blue-400',
      dot: 'bg-blue-500',
    },
  };

  const { container, dot } = sizeMap[size];
  const { ping, dot: dotColor } = variantMap[variant];

  return (
    <span className={`relative inline-flex shrink-0 ${container} ${className}`}>
      {ping && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ping} opacity-75`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${dot} ${dotColor}`} />
    </span>
  );
}
