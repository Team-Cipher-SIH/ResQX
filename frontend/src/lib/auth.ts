'use client';

import {
  AUTH_STORAGE_KEYS,
  clearStoredTokens,
  getStoredAccessToken,
} from './api';
import type { AuthorityLevel, AuthorityUser } from '@/types/authority';

export interface UserSession {
  _id: string;
  name: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  authorityLevel?: AuthorityLevel | null;
  state?: string | null;
  district?: string | null;
  jurisdictionState?: string | null;
  jurisdictionDistrict?: string | null;
  department?: string | null;
  phone?: string | null;
}

/**
 * Retrieve current logged-in user from localStorage session data.
 */
export function getCurrentUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed._id) return null;
    return {
      _id: parsed._id,
      name: parsed.name || 'User',
      email: parsed.email || '',
      role: parsed.role || 'citizen',
      authorityLevel: parsed.authorityLevel || null,
      state: parsed.state || parsed.jurisdictionState || null,
      district: parsed.district || parsed.jurisdictionDistrict || null,
      jurisdictionState: parsed.jurisdictionState || parsed.state || null,
      jurisdictionDistrict: parsed.jurisdictionDistrict || parsed.district || null,
      department: parsed.department || null,
      phone: parsed.phone || null,
    };
  } catch {
    return null;
  }
}

/**
 * Get current authority level or null if not an authority user.
 */
export function getAuthorityLevel(): AuthorityLevel | null {
  const user = getCurrentUser();
  if (!user || user.role === 'citizen') return null;
  if (user.role === 'admin') return 'central';
  return user.authorityLevel || 'central';
}

/**
 * Get the user's assigned jurisdiction (state & district).
 */
export function getUserJurisdiction(): {
  state: string | null;
  district: string | null;
} {
  const user = getCurrentUser();
  if (!user) return { state: null, district: null };
  return {
    state: user.jurisdictionState || user.state || null,
    district: user.jurisdictionDistrict || user.district || null,
  };
}

/**
 * Determine the canonical dashboard route for a given user or current session.
 */
export function getDefaultDashboardRoute(user?: UserSession | null): string {
  const activeUser = user !== undefined ? user : getCurrentUser();
  if (!activeUser) return '/authority/login';

  if (activeUser.role === 'citizen') {
    return '/citizen/dashboard';
  }

  if (activeUser.role === 'admin') {
    return '/authority/dashboard';
  }

  // Authority role dispatch based on authorityLevel
  switch (activeUser.authorityLevel) {
    case 'state_admin':
      return '/authority/state';
    case 'district_admin':
      return '/authority/district';
    case 'field_responder':
      return '/responder/dashboard';
    case 'central':
    case 'department':
    default:
      return '/authority/dashboard';
  }
}

/**
 * Check if the user is authorized to access a given URL path.
 */
export function isAuthorizedForRoute(
  pathname: string,
  user?: UserSession | null
): boolean {
  const activeUser = user !== undefined ? user : getCurrentUser();

  // Public unauthenticated routes
  const publicRoutes = [
    '/',
    '/citizen/login',
    '/citizen/register',
    '/authority/login',
    '/authority/register',
  ];
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // If not logged in, denied for any protected route
  if (!activeUser) {
    return false;
  }

  // 1. Citizen route protection
  if (pathname.startsWith('/citizen')) {
    return activeUser.role === 'citizen';
  }

  // 2. Responder route protection
  if (pathname.startsWith('/responder')) {
    if (activeUser.role === 'admin') return true;
    return (
      activeUser.role === 'authority' &&
      activeUser.authorityLevel === 'field_responder'
    );
  }

  // 3. Authority route protection
  if (pathname.startsWith('/authority')) {
    // Citizens cannot access authority pages
    if (activeUser.role !== 'authority' && activeUser.role !== 'admin') {
      return false;
    }

    const level = activeUser.role === 'admin' ? 'central' : activeUser.authorityLevel || 'central';

    // Field responders cannot access authority operational command pages
    if (level === 'field_responder') {
      return false;
    }

    // Central & Admin have access to all authority pages
    if (level === 'central' || activeUser.role === 'admin' || level === 'department') {
      return true;
    }

    // State Admin: access to /authority/state and operational pages, NOT central dashboard, NOT district
    if (level === 'state_admin') {
      if (pathname === '/authority/dashboard') return false;
      if (pathname.startsWith('/authority/district')) return false;
      return true;
    }

    // District Admin: access to /authority/district and operational pages, NOT central dashboard, NOT state
    if (level === 'district_admin') {
      if (pathname === '/authority/dashboard') return false;
      if (pathname.startsWith('/authority/state')) return false;
      return true;
    }

    return true;
  }

  return true;
}

/**
 * Centralized logout function that removes all tokens & authority metadata
 * and redirects safely to the appropriate login page.
 */
export function logout(role?: 'citizen' | 'authority'): void {
  const currentUser = getCurrentUser();
  const isCitizen = (role || currentUser?.role) === 'citizen';
  clearStoredTokens();
  if (typeof window !== 'undefined') {
    window.location.href = isCitizen ? '/citizen/login' : '/authority/login';
  }
}
