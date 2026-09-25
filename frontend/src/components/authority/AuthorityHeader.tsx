'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Radio,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  X,
  ExternalLink,
  Search,
  ArrowUpRight,
  Shield,
  Volume2,
} from 'lucide-react';
import { JurisdictionBadge } from './Badges';
import PulsingDot from '@/components/ui/PulsingDot';
import { useSocket } from '@/lib/socket';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'incident' | 'dispatch' | 'alert' | 'sos' | 'system';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  link?: string;
}

export default function AuthorityHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [userName, setUserName] = useState('Officer');
  const [authorityLevel, setAuthorityLevel] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);

  // Notification center state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('resqtech_user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.authorityLevel) setAuthorityLevel(parsed.authorityLevel);
        if (parsed.state) setState(parsed.state);
        if (parsed.district) setDistrict(parsed.district);
      }
    } catch {
      // ignore
    }

    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString('en-IN', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to live events and populate notification center
  useSocket({
    'new-incident': (data: any) => {
      const inc = data || {};
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: inc.isSOS ? '🚨 Emergency SOS Reported' : `New Incident: ${inc.title || 'Disaster Alert'}`,
        message: inc.address ? `${inc.district || ''} - ${inc.address}` : `Reported in ${inc.district || 'jurisdiction'}`,
        type: inc.isSOS ? 'sos' : 'incident',
        severity: inc.severity || (inc.isSOS ? 'critical' : 'high'),
        timestamp: new Date(),
        read: false,
        link: inc._id ? `/authority/incidents/${inc._id}` : '/authority/incidents',
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 24)]);
    },
    'sos-alert': (data: any) => {
      const inc = data || {};
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: '🚨 CRITICAL SOS ALERT TRIGGERED',
        message: `Citizen SOS beacon activated in ${inc.district || inc.state || 'local grid'}`,
        type: 'sos',
        severity: 'critical',
        timestamp: new Date(),
        read: false,
        link: inc._id ? `/authority/incidents/${inc._id}` : '/authority/incidents',
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 24)]);
    },
    'dispatch-created': (data: any) => {
      const d = data || {};
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Tactical Squad Dispatched',
        message: `Dispatch created for ${d.district || 'sector'} operation`,
        type: 'dispatch',
        severity: 'medium',
        timestamp: new Date(),
        read: false,
        link: '/authority/dispatches',
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 24)]);
    },
    'new-alert': (data: any) => {
      const alt = data || {};
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Public Warning: ${alt.title || 'Hazard Notice'}`,
        message: alt.message || 'Early warning bulletin issued by command authority',
        type: 'alert',
        severity: alt.severity || 'high',
        timestamp: new Date(),
        read: false,
        link: '/authority/alerts',
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 24)]);
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="bg-white border-b border-slate-200/90 px-6 py-4 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {title || 'Authority Command Center'}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-2xs">
              <PulsingDot variant="live" size="sm" />
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Live Grid</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
            <JurisdictionBadge level={authorityLevel} state={state} district={district} />
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-mono font-bold text-slate-800">{currentTime}</span>
          </div>

          {/* Notification Center */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs active:scale-95"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-scale-in">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Tactical Feed</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">No New Operational Alerts</p>
                      <p className="text-[11px] text-slate-400">Live Socket.IO broadcast listener is active.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) {
                            setIsNotificationOpen(false);
                            router.push(n.link);
                          }
                        }}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                          !n.read ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            n.type === 'sos' || n.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : n.type === 'dispatch'
                              ? 'bg-blue-100 text-blue-700'
                              : n.type === 'alert'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {n.type === 'sos' ? (
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                          ) : n.type === 'dispatch' ? (
                            <Send className="w-3.5 h-3.5" />
                          ) : n.type === 'alert' ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">
                              {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center px-4">
                    <button
                      onClick={clearAllNotifications}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      Clear Feed
                    </button>
                    <Link
                      href="/authority/audit"
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Full Audit Log</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
