'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredAccessToken } from '@/lib/api';

export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }
  return 'http://localhost:5000';
}

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('No access token available for socket connection');
  }

  const socketUrl = getSocketUrl();
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * React hook for subscribing to Socket.IO events.
 * Automatically connects on mount and cleans up listeners on unmount.
 */
export function useSocket(
  events?: Record<string, (data: unknown) => void>,
  options?: { teamId?: string }
) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let sock: Socket;
    try {
      sock = connectSocket();
    } catch {
      return;
    }

    // Join team room if specified
    if (options?.teamId) {
      sock.emit('join-team', options.teamId);
    }

    // Register event listeners
    const currentEvents = eventsRef.current;
    if (currentEvents) {
      Object.entries(currentEvents).forEach(([event, handler]) => {
        sock.on(event, handler);
      });
    }

    return () => {
      // Cleanup listeners
      if (currentEvents) {
        Object.entries(currentEvents).forEach(([event, handler]) => {
          sock.off(event, handler);
        });
      }
    };
  }, [options?.teamId]);

  const emit = useCallback((event: string, data?: unknown) => {
    socket?.emit(event, data);
  }, []);

  return { socket, emit };
}
