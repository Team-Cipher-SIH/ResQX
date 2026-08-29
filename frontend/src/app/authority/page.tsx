'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthorityRootPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem('resqtech_access_token');
      const userData = localStorage.getItem('resqtech_user_data');
      if (token && userData) {
        const parsed = JSON.parse(userData);
        if (parsed.role === 'authority' || parsed.role === 'admin') {
          router.replace('/authority/dashboard');
          return;
        }
      }
    } catch {
      // fallback to login
    }
    router.replace('/authority/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Redirecting to Authority Portal...</span>
      </div>
    </div>
  );
}
