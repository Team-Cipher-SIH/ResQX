'use client';

import { useState, useCallback } from 'react';
import { fetchFromApi } from '@/lib/api';

export interface SOSStatus {
  type: 'success' | 'error';
  message: string;
  data?: unknown;
  isDuplicate?: boolean;
}

export interface UseEmergencySOSOptions {
  onSuccess?: (data?: unknown) => void;
  onError?: (error: string) => void;
}

export function useEmergencySOS(options?: UseEmergencySOSOptions) {
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [sosStatus, setSosStatus] = useState<SOSStatus | null>(null);

  const triggerSOS = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser.';
      setSosStatus({
        type: 'error',
        message: errorMsg,
      });
      options?.onError?.(errorMsg);
      return;
    }

    setIsSendingSOS(true);
    setSosStatus(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;

        // Coordinate sanity check
        if (
          isNaN(latitude) ||
          isNaN(longitude) ||
          (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001)
        ) {
          setIsSendingSOS(false);
          const errorMsg = 'Invalid GPS coordinates detected. Please ensure location services are active.';
          setSosStatus({
            type: 'error',
            message: errorMsg,
          });
          options?.onError?.(errorMsg);
          return;
        }

        try {
          const response = await fetchFromApi<{
            success: boolean;
            message?: string;
            error?: string;
            isDuplicate?: boolean;
            data?: unknown;
          }>('/incidents/sos', {
            method: 'POST',
            body: JSON.stringify({
              coordinates: [longitude, latitude],
              type: 'other',
            }),
          });

          if (response.success) {
            const successMsg =
              response.message ||
              'Emergency SOS alert dispatched successfully! First responders notified.';
            setSosStatus({
              type: 'success',
              message: successMsg,
              data: response.data,
              isDuplicate: Boolean(response.isDuplicate),
            });
            options?.onSuccess?.(response.data);
          } else {
            const errorMsg =
              response.message || response.error || 'Failed to dispatch SOS alert. Please try again.';
            setSosStatus({
              type: 'error',
              message: errorMsg,
            });
            options?.onError?.(errorMsg);
          }
        } catch (err) {
          console.error('SOS dispatch error:', err);
          const errorMsg = 'Network error or unable to reach emergency server. Please retry or call helpline 112.';
          setSosStatus({
            type: 'error',
            message: errorMsg,
          });
          options?.onError?.(errorMsg);
        } finally {
          setIsSendingSOS(false);
        }
      },
      (error) => {
        setIsSendingSOS(false);
        console.error('Geolocation error:', error);
        let errorMsg = 'Unable to detect coordinates. Please try again.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access to dispatch SOS.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information unavailable. Please check device GPS settings.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        setSosStatus({
          type: 'error',
          message: errorMsg,
        });
        options?.onError?.(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [options]);

  const dismissStatus = useCallback(() => {
    setSosStatus(null);
  }, []);

  return {
    isSendingSOS,
    sosStatus,
    triggerSOS,
    dismissStatus,
  };
}
