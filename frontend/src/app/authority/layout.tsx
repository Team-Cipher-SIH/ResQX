'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AuthoritySidebar from '@/components/authority/AuthoritySidebar';
import { getCurrentUser, isAuthorizedForRoute, getDefaultDashboardRoute } from '@/lib/auth';
import { Menu, Shield, Radio } from 'lucide-react';
import PulsingDot from '@/components/ui/PulsingDot';

const PUBLIC_PATHS = ['/authority/login', '/authority/register'];

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Open command menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-600 text-white shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 font-mono">
              ResQ<span className="text-blue-600">tech</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <PulsingDot variant="live" size="sm" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Live
          </span>
        </div>
      </header>

      {/* Sidebar (Desktop + Mobile sliding drawer) */}
      <AuthoritySidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="lg:ml-64 min-h-screen transition-all duration-300 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
