'use client';

import { useEffect, useState, useRef } from 'react';

interface CountUpNumberProps {
  value: number | string;
  duration?: number;
  className?: string;
}

export default function CountUpNumber({
  value,
  duration = 750,
  className = '',
}: CountUpNumberProps) {
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
  const [displayValue, setDisplayValue] = useState<number>(() =>
    isNaN(numericValue) ? 0 : 0
  );
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    if (isNaN(numericValue)) return;

    // Respect reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayValue(numericValue);
      prevValueRef.current = numericValue;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = numericValue;
    const startTime = performance.now();

    let animationFrameId: number;

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        prevValueRef.current = endValue;
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [numericValue, duration]);

  if (isNaN(numericValue)) {
    return <span className={className}>{value}</span>;
  }

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}
