'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Users,
  Send,
  Bell,
  Home,
  Package,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Radio,
  Building2,
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import PulsingDot from '@/components/ui/PulsingDot';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function AuthoritySidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('Officer');
  const [authorityLevel, setAuthorityLevel] = useState<string>('central');
  const [jurisdiction, setJurisdiction] = useState('');

  useEffect(() => {
    try {
      const user = getCurrentUser();
      if (user) {
        if (user.name) setUserName(user.name);
        const level = user.role === 'admin' ? 'central' : user.authorityLevel || 'central';
        setAuthorityLevel(level);

        if (level === 'district_admin') {
          const dist = user.jurisdictionDistrict || user.district || '';
          const st = user.jurisdictionState || user.state || '';
          setJurisdiction(dist && st ? `${dist}, ${st}` : dist || st || 'Assigned District');
        } else if (level === 'state_admin') {
          const st = user.jurisdictionState || user.state || '';
          setJurisdiction(st ? `${st} State Command` : 'State Command');
        } else {
          setJurisdiction('National Command');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    logout('authority');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Build tailored navigation items based on authority level
  const { operationsNavItems, jurisdictionNavItems } = useMemo(() => {
    const isDistrictAdmin = authorityLevel === 'district_admin';
    const isStateAdmin = authorityLevel === 'state_admin';

    // 1. Operations Items
    const ops: NavItem[] = [];

    if (isDistrictAdmin) {
      ops.push({ label: 'District Operations', href: '/authority/district', icon: Building2 });
    } else if (isStateAdmin) {
      ops.push({ label: 'State Dashboard', href: '/authority/state', icon: MapPin });
    } else {
      ops.push({ label: 'Command Center', href: '/authority/dashboard', icon: LayoutDashboard });
    }

    ops.push(
      { label: 'Incidents', href: '/authority/incidents', icon: AlertTriangle },
      { label: 'Response Teams', href: '/authority/teams', icon: Users },
      { label: 'Dispatches', href: '/authority/dispatches', icon: Send },
      { label: 'Alerts', href: '/authority/alerts', icon: Bell },
      { label: 'Shelters & Relief', href: '/authority/shelters', icon: Home },
      { label: 'Supply Inventory', href: '/authority/supplies', icon: Package }
    );

    // 2. Jurisdiction Items (only for central/admin)
    const jur: NavItem[] = [];
    if (!isDistrictAdmin && !isStateAdmin) {
      jur.push(
        { label: 'State Overview', href: '/authority/state', icon: MapPin },
        { label: 'District Triage', href: '/authority/district', icon: Building2 }
      );
    }

    return { operationsNavItems: ops, jurisdictionNavItems: jur };
  }, [authorityLevel]);

  const levelLabel = useMemo(() => {
    switch (authorityLevel) {
      case 'district_admin':
        return 'District Administrator';
      case 'state_admin':
        return 'State Administrator';
      case 'field_responder':
        return 'Field Responder';
      case 'department':
        return 'Department Head';
      case 'central':
      default:
        return 'National Command Officer';
    }
  }, [authorityLevel]);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs shadow-blue-500/20">
            <Shield className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 font-mono block">
                ResQ<span className="text-blue-600">tech</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">Command Portal</span>
            </div>
          )}
        </Link>
      </div>

      {/* Live indicator */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <PulsingDot variant="live" size="sm" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Command Network Live
            </span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div className={`${collapsed ? '' : 'px-2'} mb-2`}>
          {!collapsed && (
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Operations
            </p>
          )}
          {operationsNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-0.5 ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
                )}
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    active ? 'text-blue-600 scale-105' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {jurisdictionNavItems.length > 0 && (
          <div className={`${collapsed ? '' : 'px-2'} pt-2 border-t border-slate-100`}>
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
                Jurisdiction
              </p>
            )}
            {jurisdictionNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-0.5 ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
                  )}
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      active ? 'text-blue-600 scale-105' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-100 py-2 px-2">
        <Link
          href="/authority/profile"
          title="Profile & Settings"
          className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/authority/profile')
              ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100/80 shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
          }`}
        >
          {isActive('/authority/profile') && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
          )}
          <UserCircle
            className={`w-4 h-4 shrink-0 ${
              isActive('/authority/profile') ? 'text-blue-600 scale-105' : 'text-slate-400'
            }`}
          />
          {!collapsed && <span>Profile & Settings</span>}
        </Link>

        {/* User info */}
        {!collapsed && (
          <div className="mx-2 mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 truncate">{levelLabel}</p>
              </div>
            </div>
            {jurisdiction && (
              <p className="text-[10px] text-slate-500 mt-1.5 truncate flex items-center gap-1 font-medium">
                <Radio className="w-3 h-3 text-blue-500 shrink-0" />
                {jurisdiction}
              </p>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Log out"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 w-full mt-1"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 p-1 bg-white border border-slate-200 rounded-full shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
    </aside>
  );
}
