'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, getDefaultDashboardRoute } from '@/lib/auth';

const PUBLIC_PATHS = ['/citizen/login', '/citizen/register'];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublicPath) {
      setIsLoading(false);
      setIsAuthorized(true);
      return;
    }

    try {
      const user = getCurrentUser();
      const token = typeof window !== 'undefined' ? localStorage.getItem('resqtech_access_token') : null;

      if (!token || !user) {
        router.replace('/citizen/login');
        return;
      }

      // If authority officer opened citizen dashboard, redirect to their authority dashboard
      if (user.role === 'authority' || user.role === 'admin') {
        const dest = getDefaultDashboardRoute(user);
        router.replace(dest);
        return;
      }

      setIsAuthorized(true);
    } catch {
      router.replace('/citizen/login');
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname, isPublicPath]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Authorizing citizen session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
