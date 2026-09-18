'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthoritySidebar from '@/components/authority/AuthoritySidebar';
import { getCurrentUser, isAuthorizedForRoute, getDefaultDashboardRoute } from '@/lib/auth';

const PUBLIC_PATHS = ['/authority/login', '/authority/register'];

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
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
        router.replace('/authority/login');
        return;
      }

      // If citizen accidentally opened authority, route to citizen dashboard
      if (user.role === 'citizen') {
        router.replace('/citizen/dashboard');
        return;
      }

      // If field responder, route to responder dashboard
      if (user.authorityLevel === 'field_responder') {
        router.replace('/responder/dashboard');
        return;
      }

      // Check specific path permission for this authority level
      const authorized = isAuthorizedForRoute(pathname, user);
      if (!authorized) {
        const targetRoute = getDefaultDashboardRoute(user);
        router.replace(targetRoute);
        return;
      }

      setIsAuthorized(true);
    } catch {
      router.replace('/authority/login');
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname, isPublicPath]);

  // For public auth routes (login, register), render directly without sidebar
  if (isPublicPath) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Verifying Security Credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuthoritySidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
