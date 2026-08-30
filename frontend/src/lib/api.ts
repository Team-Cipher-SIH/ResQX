/**
 * Disaster Management Platform - API Integration Helper
 * 
 * Supports both JSON and FormData requests.
 * Handles Bearer token injection, 401 refresh token retry, and response envelope normalization.
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
  [key: string]: unknown;
}

// Auth token storage helpers
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'resqtech_access_token',
  REFRESH_TOKEN: 'resqtech_refresh_token',
  USER_DATA: 'resqtech_user_data',
};

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER_DATA);
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onTokenRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return null;
  }

  try {
    const refreshUrl = `${API_BASE_URL}/auth/refresh`;
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await response.json();
    if (data && data.accessToken) {
      setStoredTokens(data.accessToken);
      return data.accessToken;
    }

    clearStoredTokens();
    return null;
  } catch (err) {
    console.error('Failed to refresh access token:', err);
    clearStoredTokens();
    return null;
  }
}

export async function fetchFromApi<T = unknown>(
  endpoint: string,
  options?: RequestInit,
  isRetry = false
): Promise<ApiResponse<T>> {
  // Normalize endpoint: ensure we don't duplicate /api if already in API_BASE_URL
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE_URL.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const token = getStoredAccessToken();
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const headers = new Headers(options?.headers);

  // Set default JSON Content-Type if not FormData and not explicitly set
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if present and not already specified
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized with token refresh & retry (only on protected calls, avoid infinite loop on /auth/refresh)
    if (response.status === 401 && !isRetry && !cleanEndpoint.includes('/auth/refresh') && !cleanEndpoint.includes('/auth/login')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);

        if (newToken) {
          return fetchFromApi<T>(endpoint, options, true);
        } else {
          // Token refresh failed -> force logout redirect
         if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            const publicPaths = ['/'];
            if (!publicPaths.includes(window.location.pathname)) {
              const isAuthority = window.location.pathname.startsWith('/authority') || window.location.pathname.startsWith('/responder');
              window.location.href = isAuthority ? '/authority/login' : '/citizen/login';
            }
      }        
        }
      } else {
        // Wait for active refresh to complete
        const retryPromise = new Promise<ApiResponse<T>>((resolve) => {
          addRefreshSubscriber((newToken) => {
            if (newToken) {
              resolve(fetchFromApi<T>(endpoint, options, true));
            } else {
              resolve({
                success: false,
                message: 'Session expired. Please log in again.',
                error: 'Unauthorized',
              });
            }
          });
        });
        return await retryPromise;
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || `Request failed with status ${response.status}`,
        error: data?.error || data?.message || 'Request failed',
        data,
      };
    }

    // Wrap / normalize response structure
    if (data && typeof data === 'object') {
      if ('success' in data) {
        return data as ApiResponse<T>;
      }
      return {
        success: true,
        data: data as T,
        message: data.message || 'Request successful',
        ...data,
      };
    }

    return {
      success: true,
      data: data as T,
      message: 'Request successful',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to communicate with API';
    console.warn(`[API Helper] Connection to backend at ${url} failed.`, message);
    return {
      success: false,
      error: message,
      message: 'Network error or backend unavailable',
    };
  }
}

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  CITIZEN_LOGIN: '/auth/login',
  AUTHORITY_LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  PROFILE: '/auth/profile',
  INCIDENTS_PUBLIC: '/incidents/public',

  // Incidents
  INCIDENTS: '/incidents',
  REPORT_INCIDENT: '/incidents/report',
  INCIDENT_SOS: '/incidents/sos',
  MY_REPORTS: '/incidents/my-reports',
  INCIDENT_DETAIL: (id: string) => `/incidents/${id}`,
  INCIDENT_STATUS: (id: string) => `/incidents/${id}/status`,
  INCIDENT_STATS: '/incidents/stats',
  VERIFY_INCIDENT: (id: string) => `/incidents/${id}/verify`,
  ASSIGN_INCIDENT: (id: string) => `/incidents/${id}/assign`,

  // Teams
  TEAMS: '/teams',
  TEAM_DETAIL: (id: string) => `/teams/${id}`,
  TEAM_AVAILABILITY: (id: string) => `/teams/${id}/availability`,

  // Dispatches
  DISPATCHES: '/dispatches',
  DISPATCH_DETAIL: (id: string) => `/dispatches/${id}`,
  DISPATCH_STATUS: (id: string) => `/dispatches/${id}/status`,
  ACTIVE_DISPATCHES: '/dispatches/active',

  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_ACTIVITY: '/dashboard/activity',
  DASHBOARD_DISTRICTS: '/dashboard/districts',

  // Alerts
  ALERTS: '/alerts',
  ALERTS_NEARBY: '/alerts/nearby',
  DEACTIVATE_ALERT: (id: string) => `/alerts/${id}/deactivate`,

  // Shelters
  SHELTERS: '/shelters',
  SHELTERS_NEARBY: '/shelters/nearby',
  SHELTER_DETAIL: (id: string) => `/shelters/${id}`,

  // Supplies & Inventory
  SUPPLIES: '/supplies',
  SUPPLY_STATS: '/supplies/stats',
  SUPPLIES_PUBLIC: '/supplies/public',
  SUPPLY_DETAIL: (id: string) => `/supplies/${id}`,
  SUPPLY_STOCK: (id: string) => `/supplies/${id}/stock`,

  // Help Posts
  HELP_POSTS: '/help-posts',
  MY_HELP_POSTS: '/help-posts/my-posts',
  FULFILL_HELP_POST: (id: string) => `/help-posts/${id}/fulfill`,
};
