'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, getDefaultDashboardRoute } from '@/lib/auth';

export default function ResponderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const user = getCurrentUser();
      const token = typeof window !== 'undefined' ? localStorage.getItem('resqtech_access_token') : null;

      if (!token || !user) {
        router.replace('/authority/login');
        return;
      }

      if (user.role === 'citizen') {
        router.replace('/citizen/dashboard');
        return;
      }

      // Check if user is field responder or admin
      if (user.authorityLevel !== 'field_responder' && user.role !== 'admin') {
        const dest = getDefaultDashboardRoute(user);
        router.replace(dest);
        return;
      }

      setIsAuthorized(true);
    } catch {
      router.replace('/authority/login');
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Authorizing tactical field unit...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
